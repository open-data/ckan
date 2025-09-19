// (canada fork only): promise-download module
let promiseDownload__currentDownloads = [];
let promiseDownload__language = {
  'requestedLabel': ckan.i18n._('Requesting Download...'),
  'shelfLabel': ckan.i18n._('Downloads'),
  'unfinishedDownloadsMessage': ckan.i18n._('You have unfinished downloads in this page. Do you want to stop these downloads and leave the page?'),
  'startingDownloadLabel': ckan.i18n._('Downloading file...'),
  'successDownloadLabel': ckan.i18n._('Successfully downloaded file'),
  'errorDownloadLabel': ckan.i18n._('Error downloading file, trying again through your browser'),
};

let promiseDownload__downloadArea = $('#promise-download-shelf');
if( promiseDownload__downloadArea.length == 0 ){
  $('body').append('<div id="promise-download-shelf" class="d-none"><div id="promise-download-shelf-inner"><strong><i class="fa fa-download" aria-hidden="true"></i>&nbsp;' + promiseDownload__language.shelfLabel + '</strong><div id="promise-download-shelf-list"></div></div></div>');
}
promiseDownload__downloadArea = $('#promise-download-shelf');
let downloadList = $(promiseDownload__downloadArea).find('#promise-download-shelf-list');

let promiseDownload__alertArea = $('#promise-download-alert');
if( promiseDownload__alertArea.length == 0 ){
  $('body').append('<div id="promise-download-alert" class="d-none"><div id="promise-download-alert-inner"><span><i class="fa fa-spinner" aria-hidden="true"></i>&nbsp;' + promiseDownload__language.requestedLabel + '</span></div></div>');
}
promiseDownload__alertArea = $('#promise-download-alert');

window.addEventListener('beforeunload', function(_event){
  if( promiseDownload__currentDownloads.length > 0 ){
    _event.preventDefault();
    return promiseDownload__language.unfinishedDownloadsMessage;
  }
});

function promiseDownload__formatBytes(byteInt){
  if( byteInt == 0 ){
    return '0 Bytes';
  }
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(byteInt) / Math.log(k));
  return parseFloat((byteInt / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function promiseDownload__execute_promise(vars) {
  const timestamp = Date.now();
  const randomNumber = Math.random().toString(36).substring(2, 9);
  const uniqueID = timestamp + randomNumber;

  let postData = vars.postData;
  let contentType = vars.contentType;
  let fileFormat = vars.extension;
  let fetchUrl = vars.url;
  let type = vars.method;
  let filePickerDescription = vars.description;
  let acceptableFileExtensions = [];

  filename = fetchUrl.substring(fetchUrl.lastIndexOf("/") + 1).split("?")[0];

  if( fileFormat.length ){
    filename += '.' + fileFormat;
    acceptableFileExtensions = ['.' + fileFormat];
  }

  if( ! vars.notifyOnly ){
    try{
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: filePickerDescription,
          accept: {'application/octet-stream': acceptableFileExtensions},
        }],
      });
      const writableStream = await fileHandle.createWritable();
      filename = writableStream.path;
    }catch(_exception){
      console.warn('Failed to download the file: ' + fetchUrl);
      console.warn(_exception);
      throw {'download_id': uniqueID,
             'do_fallback': true};
    }
  }

  if( ! vars.notifyOnly ){
    promiseDownload__set_download_state(state='start', uniqueID);
  }else{
    promiseDownload__set_download_state(state='requested', uniqueID);
  }

  try{
    let response;
    if( typeof type != 'undefined' && type && type == 'POST' && typeof postData != 'undefined' && postData && postData.length > 0 && typeof contentType != 'undefined' && contentType && contentType.length > 0 ){
      response = await fetch(fetchUrl, {method: type,
                                        headers: {
                                          'Content-Type': contentType
                                        },
                                        body: postData,});
    }else{
      response = await fetch(fetchUrl);
    }
    const reader = response.body.getReader();
    let byteStatusElement = $('.promise-download-icon[data-download-id="' + uniqueID + '"]').find('sup');
    let currentByteInt = 0;

    while( true ){
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if( vars.notifyOnly ){
        // return as soon as we get the first bytes
        return {'download_id': uniqueID};
      }
      currentByteInt += value.byteLength;
      let thottleTimeout = false;
      thottleTimeout = setTimeout(function(){
        $(byteStatusElement).text(promiseDownload__formatBytes(currentByteInt));
        clearTimeout(thottleTimeout);
        thottleTimeout = false;
      }, 750);
      // TODO: can we calculate percentage complete with fetch on octet-stream???
      await writableStream.write(value);
    }

    await writableStream.close();
    return {'download_id': uniqueID};

  }catch(_exception){
    console.warn('Failed to download the file: ' + fetchUrl);
    console.warn(_exception);
    throw {'download_id': uniqueID,
           'do_fallback': false};
  }

}

function promiseDownload__set_download_state(state, uuid){
  if( state == 'requested' ){
    // do not add to promiseDownload__currentDownloads so there is no window alert...
    return;
  }
  if( state == 'requestDone' ){
    // do not add to promiseDownload__currentDownloads so there is no window alert...
    $(promiseDownload__alertArea).addClass('d-none');
    return
  }
  if( state == 'start' ){
    $(downloadList).prepend('<div class="promise-download-icon" data-download-id="' + uuid + '"><span title="' + promiseDownload__language.startingDownloadLabel + '" aria-label="' + promiseDownload__language.startingDownloadLabel + '"><i class="fa fa-cloud-download" aria-hidden="true"></i>&nbsp;<small>' + filename + '&nbsp;<sup></sup></small></span></div>');
    setTimeout(function(){
      let icon = $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i');
      if( $(icon).hasClass('fa-check-circle') || $(icon).hasClass('fa-exclamation-circle') ){
        return;
      }
      $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i').removeClass('fa-cloud-download').addClass('fa-spinner');
    }, 1500);
    promiseDownload__currentDownloads.push(uuid);
    return;
  }
  if( state == 'success' ){
    $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i').removeClass('fa-cloud-download').removeClass('fa-spinner').addClass('fa-check-circle');
    $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('title', promiseDownload__language.successDownloadLabel);
    $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('aria-label', promiseDownload__language.successDownloadLabel);
    promiseDownload__currentDownloads = promiseDownload__currentDownloads.filter(function(_arrItem){
      return _arrItem != uuid;
    });
    return;
  }
  if( state == 'error' ){
    $('.promise-download-icon[data-download-id="' + uuid + '"]').find('i').removeClass('fa-cloud-download').removeClass('fa-spinner').addClass('fa-exclamation-circle');
    $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('title', promiseDownload__language.errorDownloadLabel);
    $('.promise-download-icon[data-download-id="' + uuid + '"]').find('span').attr('aria-label', promiseDownload__language.errorDownloadLabel);
    promiseDownload__currentDownloads = promiseDownload__currentDownloads.filter(function(_arrItem){
      return _arrItem != uuid;
    });
    return;
  }
}

function promiseDownload__init_download(vars){
  if( ! vars.notifyOnly ){
    $(promiseDownload__downloadArea).removeClass('d-none');
    $('footer').css({'margin-bottom': '33px'});
  }else{
    $(promiseDownload__alertArea).removeClass('d-none');
  }
  promiseDownload__execute_promise(vars).then(function(_data){
    if( ! vars.notifyOnly ){
      promiseDownload__set_download_state('success', _data.download_id);
    }else{
      promiseDownload__set_download_state('requestDone', _data.download_id);
    }
  }).catch(function(_exception){
    if( ! vars.notifyOnly ){
      promiseDownload__set_download_state('error', _exception.download_id);
      if( _exception.do_fallback ){
        if( promiseDownload__currentDownloads.length == 0 && $('.promise-download-icon').length == 0 ){
          $(promiseDownload__downloadArea).addClass('d-none');
          $(promiseDownload__alertArea).addClass('d-none');
        }
        if( typeof vars.method != 'undefined' && vars.method && vars.method == 'POST' && typeof vars.postData != 'undefined' && vars.postData && vars.postData.length > 0 && typeof vars.contentType != 'undefined' && vars.contentType && vars.contentType.length > 0 ){
          // FIXME: fallback for POST data?? if vars.method == 'POST'
          // we have the serialized data and url to POST to...might be able to create a new form element to do so...
          return;
        }
        window.open(vars.url, '_blank').focus();
      }
    }else{
      promiseDownload__set_download_state('requestDone',  _exception.download_id);
    }
  });
}

// receive iframed data from child frames e.g. DataTables View
window.addEventListener('message', function(_event){
  const currentDomain = window.location.protocol + '//' + window.location.host;
  if( _event.origin == currentDomain ){
    if( typeof _event.data != 'undefined' && typeof _event.data.message_type != 'undefined' && _event.data.message_type == 'promise-download' ){
      promiseDownload__init_download(_event.data);
    }
  }else{
    console.warn('Message received from an untrusted origin: ', _event.origin);
  }
});

// onclick of actual HTML elements using data-module="promise-download"
this.ckan.module('promise-download', function($){
  return {
    options: {
      url: '',
      method: 'GET',
      extension: '',
      description: '',
      postData: {},
      contentType: '',
      notifyOnly: true,
    },
    initialize: function(){
      let options = this.options;
      let el = this.el;

      if( options.url.length > 0 ){
        $(el).off('click.ExcutePromise');
        $(el).on('click.ExcutePromise', function(_event){
          promiseDownload__init_download(options);
        });
      }
    },
  };
});
