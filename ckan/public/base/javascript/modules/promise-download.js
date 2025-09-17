// (canada fork only): promise-download module
this.ckan.module('promise-download', function ($) {
  return {
    options: {
      url: '',
      method: 'GET',
      extension: '',
      description: '',
    },

    initialize: function () {
      const _ = this._;
      let options = this.options;
      let el = this.el;
      let currentDownloads = [];
      const unfinishedDownloadsMessage = _('You have unfinished downloads in this page. Do you want to stop these downloads and leave the page?');

      let downloadArea = $('#promise-download-shelf');
      let downloadList = $('#promise-download-shelf-list');

      let filename = options.url.substring(options.url.lastIndexOf("/") + 1).split("?")[0];
      let acceptableFileExtensions = [];
      if( options.extension.length ){
        filename += '.' + options.extension;
        acceptableFileExtensions = ['.' + options.extension];
      }

      window.addEventListener('beforeunload', function(_event){
        if( currentDownloads.length > 0 ){
          _event.preventDefault();
          return unfinishedDownloadsMessage;
        }
      });

      async function _execute_promise() {
        const timestamp = Date.now();
        const randomNumber = Math.random().toString(36).substring(2, 9);
        const uniqueID = timestamp + randomNumber;

        try{
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: options.description,
              accept: {'application/octet-stream': acceptableFileExtensions},
            }],
          });
          const writableStream = await fileHandle.createWritable();
          filename = writableStream.path;
        }catch(_exception){
          console.warn('Failed to download the file: ' + options.url);
          console.warn(_exception);
          throw {'download_id': uniqueID,
                 'do_fallback': true};
        }

        set_download_state(state='start', uniqueID);

        try{
          const response = await fetch(options.url);
          const reader = response.body.getReader();

          while( true ){
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            // TODO: can we calculate percentage complete with fetch on octet-stream???
            await writableStream.write(value);
          }

          await writableStream.close();
          return {'download_id': uniqueID};

        }catch(_exception){
          console.warn('Failed to download the file: ' + options.url);
          console.warn(_exception);
          throw {'download_id': uniqueID,
                 'do_fallback': false};
        }

      }

      function set_download_state(state, uuid){
        if( state == 'start' ){
          $(downloadList).prepend('<div class="promise-download-icon" data-download-id="' + uuid + '"><span title="' + _('Downloading file...') + '" aria-label="' + _('Downloading file...') + '"><i class="fa fa-cloud-download" aria-hidden="true"></i>&nbsp;<small>' + filename + '</small></span></div>');
          setTimeout(function(){
            let icon = $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i');
            if( $(icon).hasClass('fa-check-circle') || $(icon).hasClass('fa-exclamation-circle') ){
              return;
            }
            $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i').removeClass('fa-cloud-download').addClass('fa-spinner');
          }, 1500);
          currentDownloads.push(uuid);
          return;
        }
        if( state == 'success' ){
          $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i').removeClass('fa-cloud-download').removeClass('fa-spinner').addClass('fa-check-circle');
          $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('title', _('Successfully downloaded file'));
          $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('aria-label', _('Successfully downloaded file'));
          currentDownloads = currentDownloads.filter(function(_arrItem){
            return _arrItem != uuid;
          });
          return;
        }
        if( state == 'error' ){
          $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i').removeClass('fa-cloud-download').removeClass('fa-spinner').addClass('fa-exclamation-circle');
          $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('title', _('Error downloading file, trying again through your browser'));
          $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('aria-label', _('Error downloading file, trying again through your browser'));
          currentDownloads = currentDownloads.filter(function(_arrItem){
            return _arrItem != uuid;
          });
          return;
        }
      }

      if( options.url.length > 0 ){
        $(el).off('click.ExcutePromise');
        $(el).on('click.ExcutePromise', function(_event){
          _event.preventDefault();
          $(downloadArea).removeClass('d-none');
          $('footer').css({'margin-bottom': '33px'});
          _execute_promise().then(function(_data){
            set_download_state('success', _data.download_id);
          }).catch(function(_exception){
            set_download_state('error', _exception.download_id);
            if( _exception.do_fallback ){
              if( currentDownloads.length == 0 && $('.promise-download-icon').length == 0 ){
                $(downloadArea).addClass('d-none');
              }
              window.open($(el).attr('href'), '_blank').focus();
            }
          });

        });

      }
    }
  };
});
