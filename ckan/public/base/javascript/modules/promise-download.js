// (canada fork only): promise-download module
this.ckan.module('promise-download', function ($) {
  return {
    options: {
      url: '',
      method: 'GET',
      extension: '',
    },

    initialize: function () {
      const _ = this._;
      let options = this.options;
      let el = this.el;

      async function _execute_promise(_uri, _params) {
        const fileHandle = await window.showSaveFilePicker({
          types: [{
            description: _('Choose where to save the file...'),
            accept: { 'application/octet-stream': ['.' + options.extension] },
          }],
        });
        const writableStream = await fileHandle.createWritable();
        const response = await fetch(_uri);
        const reader = response.body.getReader();

        while( true ){
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            await writableStream.write(value);
        }

        await writableStream.close();
      }

      if( options.url.length > 0 ){

        $(el).off('click.ExcutePromise');
        $(el).on('click.ExcutePromise', function(_event){
          _event.preventDefault();
          $(el).addClass('promise-download-executing');
          $(el).attr('tabindex', -1);
          _execute_promise(options.url, {}).then(function(){
            $(el).removeClass('promise-download-executing').removeClass('promise-download-failed').addClass('promise-download-complete');
            $(el).attr('tabindex', 0);
          }).catch(function(_exception){
            console.warn('Failed to download the file: ' + options.url);
            console.warn(_exception);
            $(el).removeClass('promise-download-executing').removeClass('promise-download-complete').addClass('promise-download-failed');
            $(el).attr('tabindex', 0);
            // fallback to normal link follow...
            window.open($(el).attr('href'), '_blank').focus();
          });

        });

      }
    }
  };
});
