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
      let isDownloading = false;
      const unfinishedDownloadsMessage = _('You have unfinished downloads in this page. Do you want to stop these downloads and leave the page?');

      // TODO: check for existing download in the shelf to show or hide it...

      let downloadArea = $('#promise-download-shelf');
      if( downloadArea.length == 0 || typeof downloadArea == 'undefined' ){
        $('body').append('<div id="promise-download-shelf"><div id="promise-download-shelf-inner"><h4><i class="fa fa-download" aria-hidden="true"></i>&nbsp;' + _('Downloads') + '</h4></div></div>');
      }

      window.addEventListener('beforeunload', function(_event){
        if( isDownloading ){
          _event.preventDefault();
          return unfinishedDownloadsMessage;
        }
      });

      async function _execute_promise(_uri, _params) {
        let filename = _uri.substring(_uri.lastIndexOf("/") + 1).split("?")[0];
        let acceptableFileExtensions = [];
        if( options.extension.length ){
          filename += '.' + options.extension;
          acceptableFileExtensions = ['.' + options.extension];
        }
        // const fileHandle = await window.showSaveFilePicker({
        //   suggestedName: filename,
        //   types: [{
        //     description: options.description,
        //     accept: {'application/octet-stream': acceptableFileExtensions},
        //   }],
        // });
        // const writableStream = await fileHandle.createWritable();
        const response = await fetch(_uri);
        const reader = response.body.getReader();

        isDownloading = true;

        while( true ){
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          console.log('DOWNLOADING: ' + value.byteLength);
          // await writableStream.write(value);
        }

        // await writableStream.close();
      }

      if( options.url.length > 0 ){

        // <i class="fa fa-chevron-right" aria-hidden="true"></i>
        // <i class="fa fa-chevron-left" aria-hidden="true"></i>

        $(el).off('click.ExcutePromise');
        $(el).on('click.ExcutePromise', function(_event){
          _event.preventDefault();
          $(el).addClass('promise-download-executing');
          $(el).attr('tabindex', -1);
          $(el).attr('title', _('Downloading file...'));
          $(el).attr('aria-label', _('Downloading file...'));
          _execute_promise(options.url, {}).then(function(){
            $(el).removeClass('promise-download-executing').removeClass('promise-download-failed').addClass('promise-download-complete');
            $(el).attr('tabindex', 0);
            $(el).attr('title', _('Successfully downloading file'));
            $(el).attr('aria-label', _('Successfully downloading file'));
            isDownloading = false;
          }).catch(function(_exception){
            console.warn('Failed to download the file: ' + options.url);
            console.warn(_exception);
            $(el).removeClass('promise-download-executing').removeClass('promise-download-complete').addClass('promise-download-failed');
            $(el).attr('tabindex', 0);
            $(el).attr('title', _('Error downloading file, trying again through your browser'));
            $(el).attr('aria-label', _('Error downloading file, trying again through your browser'));
            isDownloading = false;
            // fallback to normal link follow...
            // TODO: enable for prod...
            // window.open($(el).attr('href'), '_blank').focus();
          });

        });

      }
    }
  };
});
