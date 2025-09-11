this.ckan.module('resource-upload-field', function (jQuery) {
  var _nameIsDirty = !! $('input[name="name"]').val();
  var urlField = $('#field-resource-url');
  return {
    initialize: function() {
      $('input[name="name"]').on('change', function() {
        _nameIsDirty = true;
      });

      // Change input type to text if Upload is selected
      if ($('#resource-url-upload').prop('checked')) {
        urlField.attr('type', 'text');
      }

      // revert to URL for Link option
      $('#resource-link-button').on('click', function() {
        urlField.attr('type', 'url');
      })

      $('#field-resource-upload').on('change', function(_event) {  // (canada fork only): use File API
        if (_nameIsDirty) {
          return;
        }

        // (canada fork only): use File API
        const selectedFile = _event.target.files[0];
        let file_name = '';
        if( selectedFile ){
          file_name = selectedFile.name;
        }

        // Internet Explorer 6-11 and Edge 20+
        var isIE = !!document.documentMode;
        var isEdge = !isIE && !!window.StyleMedia;
        // for IE/Edge when 'include filepath option' is enabled
        if (isIE || isEdge) {
          var fName = file_name.match(/[^\\\/]+$/);
          file_name = fName ? fName[0] : file_name;
        }

        $('input[name="name"]').val(file_name);
      });

      // (canada fork only): CSP support
      let uploadButton = $('#resource-upload-button');
      if( uploadButton.length > 0 ){
        $(uploadButton).off('click.ResourceEdit');
        $(uploadButton).on('click.ResourceEdit', function(_event){
          let uploadField = document.getElementById('resource-url-upload');
          if( typeof uploadField !== 'undefined' && uploadField != null ){
            uploadField.checked = true;
          }
          document.getElementById('field-resource-upload').click();
        });
      }
      let linkButton = $('#resource-link-button');
      if( linkButton.length > 0 ){
        $(linkButton).off('click.ResourceEdit');
        $(linkButton).on('click.ResourceEdit', function(_event){
          let urlField = document.getElementById('resource-url-link');
          if( typeof urlField !== 'undefined' && urlField != null ){
            urlField.checked = true;
          }
          document.getElementById('field-resource-url').focus();
        });
      }
      let removeURIButtons = $('.btn-remove-url');
      if( removeURIButtons.length > 0 ){
        $(removeURIButtons).each(function(_index, _removeURIButton){
          $(_removeURIButton).off('click.ResourceEdit');
          $(_removeURIButton).on('click.ResourceEdit', function(_event){
            let clearUploadField = document.getElementById('field-clear-upload');
            if( typeof clearUploadField !== 'undefined' && clearUploadField != null ){
              clearUploadField.checked = true;
            }
            document.getElementById('resource-url-none').checked = true;
            document.getElementById($(_removeURIButton).attr('data-first-button')).focus();
            if( $(_removeURIButton).attr('data-is-upload') == 'true' || $(_removeURIButton).attr('data-is-upload') == true || $(_removeURIButton).attr('data-is-upload') == 'True' ){
              $('#field-resource-upload').replaceWith($('#field-resource-upload').val('').clone(true));
            }else{
              $('#field-resource-url').val('');
            }
          });
        });
      }

    }
  }
});
