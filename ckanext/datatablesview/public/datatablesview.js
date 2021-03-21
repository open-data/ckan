/* global $ jQuery gdataDict gresviewId */

// global vars used for state saving/deeplinking
let gsavedPage
let gsavedPagelen
let gsavedSelected
// global var for current view mode (table/list)
let gcurrentView = 'table'
// global var for sort info, global so we can show it in copy/print
let gsortInfo = ''
// global vars for filter info labels
let gtableSearchText = ''
let gcolFilterText = ''

let datatable
const gisFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1

// HELPER FUNCTIONS
// helper for filtered downloads
const run_query = function (params, format) {
  const form = $('#filtered-datatables-download')
  const p = $('<input name="params" type="hidden"/>')
  p.attr('value', JSON.stringify(params))
  form.append(p)
  const f = $('<input name="format" type="hidden"/>')
  f.attr('value', format)
  form.append(f)
  form.submit()
  p.remove()
  f.remove()
}

// helper for setting expiring localstorage, ttl in secs
function setWithExpiry (key, value, ttl) {
  const now = new Date()

  // `item` is an object which contains the original value
  // as well as the time when it's supposed to expire
  const item = {
    value: value,
    expiry: ttl > 0 ? now.getTime() + (ttl * 1000) : 0
  }
  window.localStorage.setItem(key, JSON.stringify(item))
}

// helper for getting expiring localstorage
function getWithExpiry (key) {
  const itemStr = window.localStorage.getItem(key)
  // if the item doesn't exist, return null
  if (!itemStr) {
    return null
  }
  let item
  try {
    item = JSON.parse(itemStr)
  } catch {
    return null
  }
  const now = new Date()
  // compare the expiry time of the item with the current time
  if (item.expiry && now.getTime() > item.expiry) {
    // If the item is expired, delete the item from storage
    // and return null
    window.localStorage.removeItem(key)
    return null
  }
  return item.value
}

// helper for modal print
function printModal (title) {
  const contents = document.querySelector('.dtr-details').innerHTML
  const prtWindow = window.open('', '_blank')
  prtWindow.document.write('<html><body ><h1>' + title + '</h1><table><tbody>')
  prtWindow.document.write(contents)
  prtWindow.document.write('</tbody></table></html>')
  prtWindow.print()
  prtWindow.close()
}

// helper for modal clipboard copy
function copyModal (title) {
  const origHeaderText = $('#modalHeader').text()
  $('#modalHeader').text(title + ' ' + origHeaderText)
  const el = document.querySelector('.dtr-modal-content')
  const body = document.body
  let range
  let sel
  if (document.createRange && window.getSelection) {
    range = document.createRange()
    sel = window.getSelection()
    sel.removeAllRanges()
    try {
      range.selectNodeContents(el)
      sel.addRange(range)
    } catch (e) {
      range.selectNode(el)
      sel.addRange(range)
    }
  } else if (body.createTextRange) {
    range = body.createTextRange()
    range.moveToElementText(el)
    range.select()
  }
  document.execCommand('copy')
  window.getSelection().removeAllRanges()
  $('#modalHeader').text(origHeaderText)
}

// force column auto width adjustment to kick in
// used by "Autofit columns" button
function fitColText () {
  const dt = $('#dtprv').DataTable({ retrieve: true })
  if (gcurrentView === 'list') {
    dt.responsive.recalc()
  }
  dt.columns.adjust().draw(false)
}

// ensure element id is valid
function validateId (id) {
  id = id.toLowerCase()
  // Make alphanumeric (removes all other characters)
  id = id.replace(/[^a-z0-9_\s-]/g, '')
  // Convert whitespaces and underscore to #
  id = id.replace(/[\s_]/g, '#')
  // Convert multiple # to hyphen
  id = id.replace(/[#]+/g, '-')
  return id
}

// compile sort & active filters for display in print, clipboard copy & search tooltip
function filterInfo (dt, noHtml = false, justFilterInfo = false, wrapped = false) {
  let filtermsg = justFilterInfo ? '' : document.getElementById('dtprv_info').innerText

  const selinfo = document.getElementsByClassName('select-info')[0]

  if (selinfo !== undefined) {
    filtermsg = filtermsg.replace(selinfo.innerText, ', ' + selinfo.innerText)
  }

  const tablesearch = dt.search()

  // add active filter info to messageTop
  if (tablesearch) {
    filtermsg = filtermsg + '<br/> <b>' + gtableSearchText + ':</b> ' + tablesearch
  } else {
    let colsearchflag = false
    let colsearchmsg = ''
    dt.columns().every(function () {
      const colsearch = this.search()
      const colname = this.name()

      if (colsearch) {
        colsearchflag = true
        colsearchmsg = colsearchmsg + ' <b>' + colname + ':</b> ' + colsearch + ', '
      }
    })
    if (colsearchflag) {
      filtermsg = filtermsg + '<br/> <b>' + gcolFilterText + ' - </b>' + colsearchmsg.slice(0, -2)
    }
  }
  filtermsg = justFilterInfo ? filtermsg : filtermsg + '<br/>' + gsortInfo
  filtermsg = noHtml ? filtermsg.replace(/(<([^>]+)>)/ig, '') : filtermsg
  filtermsg = wrapped ? filtermsg.replace(/,/g, '\n') : filtermsg
  return filtermsg
};

// Copy deeplink to clipboard
function copyLink (dt, deeplink, shareText, sharemsgText) {
  const hiddenDiv = $('<div/>')
    .css({
      height: 1,
      width: 1,
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    })

  const textarea = $('<textarea readonly/>')
    .val(deeplink)
    .appendTo(hiddenDiv)

  // save & deselect rows, so we copy the link, not the rows
  const selectedRows = dt.rows({ selected: true })[0]
  dt.rows().deselect()

  hiddenDiv.appendTo(dt.table().container())
  textarea[0].focus()
  textarea[0].select()

  hiddenDiv.appendTo(dt.table().container())
  textarea[0].focus()
  textarea[0].select()
  // use copy execCommand to copy link to clipboard
  const successful = document.execCommand('copy')
  hiddenDiv.remove()

  if (successful) {
    dt.buttons.info(shareText, sharemsgText, 2000)
  }
  dt.rows(selectedRows).select()
}

// helper for hiding search inputs for list/responsive mode
function hideSearchInputs (columns) {
  for (let i = 0; i < columns.length; i++) {
    if (columns[i]) {
      $('#cdx' + i).show()
    } else {
      $('#cdx' + i).hide()
    }
  }
}

// helper for setting up filterObserver
function initFilterObserver () {
  // if no filter is active, make all search inputs background transparent & turn off filter tooltip
  // this is less expensive than querying the DT api to check global filter and each column
  // separately for filter status. Here, we're checking if an open parenthesis is in the filter info,
  // which indicates that there is a filter active, regardless of language
  // (e.g. "4 of 1000 entries (filtered from...)")
  const filterObserver = new MutationObserver(function (e) {
    const infoText = document.getElementById('dtprv_info').innerText
    if (!infoText.includes('(')) {
      $('#dtprv_filter input').css('background-color', 'transparent')
      $('th.fhead input').css('background-color', 'transparent')
      document.getElementById('filterinfoicon').style.visibility = 'hidden'
    } else {
      document.getElementById('filterinfoicon').style.visibility = 'visible'
    }
  })
  try {
    filterObserver.observe(document.getElementById('dtprv_info'), { characterData: true, subtree: true, childList: true })
  } catch (e) {}
}

// helper for wrapping text
const wordWrap = (s, w) => s.replace(
  new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1<br/> '
)

// MAIN
this.ckan.module('datatables_view', function (jQuery) {
  return {
    initialize: function () {
      const that = this

      // fetch parameters from template data attributes
      const dtprv = $('#dtprv')
      const resourcename = dtprv.data('resource-name')
      const languagefile = dtprv.data('languagefile')
      const statesaveflag = dtprv.data('state-save-flag')
      const stateduration = parseInt(dtprv.data('state-duration'))
      const packagename = dtprv.data('package-name')
      const responsiveflag = dtprv.data('responsive-flag')
      const pagelengthchoices = dtprv.data('page-length-choices')
      const ajaxurl = dtprv.data('ajaxurl')
      const ckanfilters = dtprv.data('ckanfilters')
      const resourceurl = dtprv.data('resource-url')
      const defaultview = dtprv.data('default-view')

      // get view mode setting from localstorage (table or list/responsive])
      const lastView = getWithExpiry('lastView')
      if (!lastView) {
        if (responsiveflag) {
          gcurrentView = 'list' // aka responsive
        } else {
          gcurrentView = defaultview
        }
        setWithExpiry('lastView', gcurrentView, 0)
      } else {
        gcurrentView = lastView
      }

      // get column definitions dynamically from data dictionary,
      // init data structure with _id column definition
      const dynamicCols = [{
        data: '_id',
        searchable: false,
        type: 'num',
        className: 'dt-body-right',
        width: gcurrentView === 'table' ? '28px' : '50px'
      }]

      // allow data publisher to explicitly configure column definition by using
      // these whitelisted keys in a JSON at the end of the column description
      // see https://datatables.net/reference/option/columnDefs options for details
      const allowedKeys = ['type', 'width', 'className', 'contentPadding', 'orderable', 'wordwrap']

      gdataDict.forEach((colDefn, idx) => {
        let dtType
        switch (colDefn.type) {
          case 'numeric':
            dtType = 'num'
            break
          case 'timestamp':
            dtType = 'date'
            break
          default:
            dtType = 'string'
        }
        let colDict = { name: colDefn.id, data: colDefn.id, type: dtType }
        let extraColDefnDict = {}
        // check if there are any datatables JSON col defns in the column description
        if (colDefn?.info?.notes) {
          const extraColDefn = colDefn.info.notes.match(/\{.*?\}$/)
          if (extraColDefn) {
            try {
              extraColDefnDict = JSON.parse(extraColDefn[0])
            } catch (e) {
              extraColDefnDict = {}
            }
          }
        }
        const filteredDict = allowedKeys.reduce((obj, key) => ({ ...obj, [key]: extraColDefnDict[key] }), {})
        if (Number.isInteger(filteredDict?.width)) {
          filteredDict.width = filteredDict.width + 'em'
        }
        if (Number.isInteger(filteredDict?.wordwrap)) {
          filteredDict.render = function (data, type, row) {
            data = wordWrap(data, filteredDict.wordwrap)
            return data
          }
        }
        colDict = Object.assign({}, colDict, filteredDict)
        dynamicCols.push(colDict)
      })

      // labels for showing active filters in clipboard copy & print
      gtableSearchText = that._('TABLE FILTER')
      gcolFilterText = that._('COLUMN FILTER/S')

      let activelanguage = languagefile
      // en is the default language, no need to load i18n file
      if (languagefile === '/vendor/DataTables/i18n/en.json') {
        activelanguage = ''
      }

      // settings if gcurrentView === table
      let scrollXflag = true
      let responsiveSettings = false

      if (gcurrentView === 'list') {
        // we're in list view mode (aka responsive mode)
        // not compatible with scrollX
        scrollXflag = false

        // create _colspacer column to ensure display of green record detail button
        dynamicCols.push({
          data: '_colspacer',
          searchable: false,
          className: 'none',
          defaultContent: ''
        })

        // initialize settings for responsive mode (list view)
        responsiveSettings = {
          details: {
            display: $.fn.dataTable.Responsive.display.modal({
              header: function (row) {
                // add clipboard and print buttons to modal record display
                return '<div id ="modalHeader"><span style="font-size:200%;font-weight:bold;">Details:</span><div class="dt-buttons btn-group">' +
                  '<button id="modalcopy-button" class="btn btn-default" title="' + that._('Copy to clipboard') + '" onclick="copyModal(\'' +
                  packagename + '&mdash;' + resourcename + '\')"><i class="fa fa-files-o"></i></button>' +
                  '<button id="modalprint-button" class="btn btn-default" title="' + that._('Print') + '" onclick="printModal(\'' +
                  packagename + '&mdash;' + resourcename + '\')"><i class="fa fa-print"></i></button>' +
                  '&nbsp;&nbsp;&nbsp;&nbsp;</div></div>'
              }
            }),
            // render the Record Details in a modal dialog box
            // do not render the _colspacer column, which has the 'none' class
            // the none class in responsive mode forces the _colspacer column to be hidden
            // guaranteeing the green display record button is always displayed, even for narrow tables
            renderer: function (api, rowIdx, columns) {
              const data = $.map(columns, function (col, i) {
                return col.className !== 'none'
                  ? '<tr class="dt-body-right" data-dt-row="' + col.rowIndex + '" data-dt-column="' + col.columnIndex + '">' +
                    '<td>' + col.title + ':' + '</td> ' +
                    '<td>' + col.data + '</td>' +
                    '</tr>'
                  : ''
              }).join('')
              return data ? $('<table class="dtr-details" width="100%"/>').append(data) : false
            }
          }
        }
      } else {
        // we're in table view mode
        // remove _colspacer column/filter if it exists
        $('#_colspacer').remove()
        $('#_colspacerfilter').remove()
      }

      // create column filters
      $('.fhead').each(function (i) {
        const thecol = this
        const colname = thecol.textContent
        const colid = 'dtcol-' + validateId(colname) + '-' + i
        $('<input id="' + colid + '" name="' + colid + '" autosave="' + colid +
                '" class="fhead form-control input-sm" type="search" results="10" autocomplete="on" style="width:100%"/>')
          .appendTo($(thecol).empty())
          .on('keyup search', function (event) {
            const colSelector = colname + ':name'
            // Firefox doesn't do clearing of input when ESC is pressed
            if (gisFirefox && event.keyCode === 27) {
              this.value = ''
            }
            //  only do column search on enter or clearing of input
            if (event.keyCode === 13 || (this.value === '' && datatable.column(colSelector).search() !== '')) {
              datatable
                .column(colSelector)
                .search(this.value)
                .draw(false)
            }
          })
      })

      // init the datatable
      datatable = $('#dtprv').DataTable({
        paging: true,
        serverSide: true,
        processing: true,
        deferRender: true,
        stateSave: statesaveflag,
        stateDuration: stateduration,
        colReorder: {
          fixedColumnsLeft: 1
        },
        autoWidth: true,
        orderCellsTop: true,
        mark: true,
        // Firefox messes up clipboard copy & deeplink share
        // with key extension clipboard support on. Turn it off
        keys: gisFirefox ? { clipboard: false } : true,
        select: {
          style: 'os',
          blurable: true
        },
        language: {
          url: activelanguage,
          paginate: {
            previous: '&lt;',
            next: '&gt;'
          }
        },
        columns: dynamicCols,
        ajax: {
          url: ajaxurl,
          type: 'POST',
          timeout: 60000,
          data: function (d) {
            d.filters = ckanfilters
          }
        },
        responsive: responsiveSettings,
        scrollX: scrollXflag,
        scrollY: 600,
        scrollResize: true,
        scrollCollapse: false,
        lengthMenu: pagelengthchoices,
        dom: 'lBifrt<"resourceinfo"><"sortinfo">p',
        stateLoadParams: function (settings, data) {
          // this callback is invoked whenever state info is loaded

          // check the current url to see if we've got a state to restore from a deeplink
          const url = new URL(window.location.href)
          let state = url.searchParams.get('state')

          if (state) {
            // if so, try to base64 decode it and parse into object from a json
            try {
              state = JSON.parse(window.atob(state))
              // now iterate over the object properties and assign any that
              // exist to the current loaded state (skipping "time")
              for (const k in state) {
                if (Object.prototype.hasOwnProperty.call(state, k) && k !== 'time') {
                  data[k] = state[k]
                }
              }
            } catch (e) {
              console.error(e)
            }
          }

          // save current page
          gsavedPage = data.page
          gsavedPagelen = data.pagelen

          // save selected rows settings
          gsavedSelected = data.selected
          // save view mode
          setWithExpiry('lastView', data.viewmode, 0)

          // restore values of column filters
          const api = new $.fn.dataTable.Api(settings)
          api.columns().every(function (colIdx) {
            const col = data.columns[colIdx]
            if (typeof col !== 'undefined') {
              const colSearch = col.search
              if (colSearch.search) {
                $('#cdx' + colIdx + ' input').val(colSearch.search)
              }
            }
          })
          api.draw(false)
        }, // end stateLoadParams
        stateSaveParams: function (settings, data) {
          // this callback is invoked when saving state info

          // let's also save page, pagelen and selected rows in state info
          data.page = this.api().page()
          data.pagelen = this.api().page.len()
          data.selected = this.api().rows({ selected: true })[0]
          data.viewmode = gcurrentView

          // shade the reset button darkred if there is a saved state
          const lftflag = parseInt(getWithExpiry('loadctr-' + gresviewId))
          if (lftflag < 3 || isNaN(lftflag)) {
            setWithExpiry('loadctr-' + gresviewId, isNaN(lftflag) ? 1 : lftflag + 1, stateduration)
            $('.resetButton').css('color', 'black')
          } else {
            setWithExpiry('loadctr-' + gresviewId, lftflag + 1, stateduration)
            $('.resetButton').css('color', 'darkred')
          }
        }, // end stateSaveParams
        initComplete: function (settings, json) {
          // this callback is invoked by DataTables when table is fully rendered
          const api = this.api()
          // restore some data-dependent saved states now that data is loaded
          if (typeof gsavedPage !== 'undefined') {
            api.page.len(gsavedPagelen)
            api.page(gsavedPage)
          }

          // restore selected rows from state
          if (typeof gsavedSelected !== 'undefined') {
            api.rows(gsavedSelected).select()
          }

          // add filterinfo by global search label
          $('#dtprv_filter label').before('<i id="filterinfoicon" class="fa fa-info-circle"</i>&nbsp;')

          // on mouseenter on Search info icon, update tooltip with filterinfo
          $('#filterinfoicon').mouseenter(function () {
            document.getElementById('filterinfoicon').title = filterInfo(datatable, true, true, true) +
              '\n' + that._('Double-click to reset filters')
          })

          // on dblclick on Search info icon, clear all filters
          $('#filterinfoicon').dblclick(function () {
            datatable.search('')
              .columns().search('')
              .draw(false)
            $('th.fhead input').val('')
          })

          // add resourceinfo in footer, very useful if this view is embedded
          const resourceInfo = document.getElementById('dtv-resource-info').innerText
          $('div.resourceinfo').html('<a href="' + resourceurl + '">' +
            packagename + '&mdash;' + resourcename +
            '</a> <i class="fa fa-info-circle" title="' + resourceInfo + '"</i>')

          // if in list/responsive mode, hide search inputs for hidden columns
          if (gcurrentView === 'list') {
            hideSearchInputs(api.columns().responsiveHidden().toArray())
          }

          // only do table search on enter key, or clearing of input
          const tableSearchInput = $('#dtprv_filter label input')
          tableSearchInput.unbind()
          tableSearchInput.bind('keyup search', function (event) {
            // Firefox doesn't do clearing of input when ESC is pressed
            if (gisFirefox && event.keyCode === 27) {
              this.value = ''
            }
            if (event.keyCode === 13 || (tableSearchInput.val() === '' && datatable.search() !== '')) {
              datatable
                .search(this.value)
                .draw()
            }
          })

          // start showing page once everything is just about rendered
          // we need to make it visible now so smartsize works if needed
          document.getElementsByClassName('dt-view')[0].style.visibility = 'visible'

          const url = new URL(window.location.href)
          const state = url.searchParams.get('state')
          // if there is a state url parm, its a deeplink share
          if (state) {
            // we need to reload to get the deeplink active
            // to init localstorage
            if (!getWithExpiry('deeplink_firsttime')) {
              setWithExpiry('deeplink_firsttime', true, 4)
              setTimeout(function () {
                window.location.reload()
              }, 200)
            }
          } else {
            // otherwise, do a smartsize check to fill up screen
            // if default pagelen is too low and there is available space
            const currPageLen = api.page.len()
            if (json.recordsTotal > currPageLen) {
              const scrollBodyHeight = $('#resize_wrapper').height() - ($('.dataTables_scrollHead').height() * 2.75)
              const rowHeight = $('tbody tr').first().height()
              // find nearest pagelen to fill display
              const minPageLen = Math.floor(scrollBodyHeight / rowHeight)
              if (currPageLen < minPageLen) {
                for (const pageLen of pagelengthchoices) {
                  if (pageLen >= minPageLen) {
                    api.page.len(pageLen)
                    api.ajax.reload()
                    api.columns.adjust()
                    window.localStorage.removeItem('loadctr-' + gresviewId)
                    console.log('smart sized >' + minPageLen)
                    setTimeout(function () {
                      const api = $('#dtprv').DataTable({ retrieve: true })
                      api.draw(false)
                      fitColText()
                    }, 100)
                    break
                  }
                }
              }
            }
          }
        }, // end InitComplete
        buttons: [{
          name: 'viewToggleButton',
          text: gcurrentView === 'table' ? '<i class="fa fa-list"></i>' : '<i class="fa fa-table"></i>',
          titleAttr: that._('Table/List toggle'),
          action: function (e, dt, node, config) {
            if (gcurrentView === 'list') {
              dt.button('viewToggleButton:name').text('<i class="fa fa-table"></i>')
              gcurrentView = 'table'
              $('#dtprv').removeClass('dt-responsive')
            } else {
              dt.button('viewToggleButton:name').text('<i class="fa fa-list"></i>')
              gcurrentView = 'list'
              $('#dtprv').addClass('dt-responsive')
            }
            setWithExpiry('lastView', gcurrentView, 0)
            window.localStorage.removeItem('loadctr-' + gresviewId)
            dt.state.clear()
            window.location.reload()
          }
        }, {
          extend: 'copy',
          text: '<i class="fa fa-files-o"></i>',
          titleAttr: that._('Copy to clipboard'),
          title: function () {
            // remove html tags from filterInfo msg
            const filternohtml = filterInfo(datatable, true)
            return resourcename + ' - ' + filternohtml
          },
          exportOptions: {
            columns: ':visible'
          }
        }, {
          extend: 'colvis',
          text: '<i class="fa fa-eye-slash"></i>',
          titleAttr: that._('Toggle column visibility'),
          columns: ':gt(0)',
          collectionLayout: 'fixed four-column',
          postfixButtons: [{
            extend: 'colvisRestore',
            text: '<i class="fa fa-undo"></i> ' + that._('Restore visibility')
          }, {
            extend: 'colvisGroup',
            text: '<i class="fa fa-eye"></i> ' + that._('Show all'),
            show: ':hidden'
          }, {
            extend: 'colvisGroup',
            text: '<i class="fa fa-eye-slash"></i> ' + that._('Show none'),
            action: function () {
              datatable.columns().every(function () {
                if (this.index()) { // always show _id col, index 0
                  this.visible(false)
                }
              })
            }
          }, {
            extend: 'colvisGroup',
            text: '<i class="fa fa-filter"></i> ' + that._('Filtered'),
            action: function () {
              datatable.columns().every(function () {
                if (this.index()) { // always show _id col, index 0
                  if (this.search()) {
                    this.visible(true)
                  } else {
                    this.visible(false)
                  }
                }
              })
            }
          }]
        }, {
          text: '<i class="fa fa-download"></i>',
          titleAttr: that._('Filtered download'),
          autoClose: true,
          extend: 'collection',
          buttons: [{
            text: 'CSV',
            action: function (e, dt, button, config) {
              const params = datatable.ajax.params()
              params.visible = datatable.columns().visible().toArray()
              run_query(params, 'csv')
            }
          }, {
            text: 'TSV',
            action: function (e, dt, button, config) {
              const params = datatable.ajax.params()
              params.visible = datatable.columns().visible().toArray()
              run_query(params, 'tsv')
            }
          }, {
            text: 'JSON',
            action: function (e, dt, button, config) {
              const params = datatable.ajax.params()
              params.visible = datatable.columns().visible().toArray()
              run_query(params, 'json')
            }
          }, {
            text: 'XML',
            action: function (e, dt, button, config) {
              const params = datatable.ajax.params()
              params.visible = datatable.columns().visible().toArray()
              run_query(params, 'xml')
            }
          }]
        }, {
          name: 'resetButton',
          text: '<i class="fa fa-repeat"></i>',
          titleAttr: that._('Reset'),
          className: 'resetButton',
          action: function (e, dt, node, config) {
            dt.state.clear()
            $('.resetButton').css('color', 'black')
            window.localStorage.removeItem('loadctr-' + gresviewId)
            window.location.reload()
          }
        }, {
          extend: 'print',
          text: '<i class="fa fa-print"></i>',
          titleAttr: that._('Print'),
          title: packagename + ' — ' + resourcename,
          messageTop: function () {
            return filterInfo(datatable)
          },
          messageBottom: function () {
            return filterInfo(datatable)
          },
          exportOptions: {
            columns: ':visible'
          }
        }, {
          name: 'shareButton',
          text: '<i class="fa fa-share"></i>',
          titleAttr: that._('Share current view'),
          action: function (e, dt, node, config) {
            dt.state.save()
            const sharelink = window.location.href + '?state=' + window.btoa(JSON.stringify(dt.state()))
            copyLink(dt, sharelink, that._('Share current view'), that._('Copied deeplink to clipboard'))
          }
        }]
      })

      if (!statesaveflag) {
        // "Reset" & "Share current view" buttons require state saving
        // remove those buttons if state saving is off
        datatable.button('resetButton:name').remove()
        datatable.button('shareButton:name').remove()
      }

      // EVENT HANDLERS
      // save state of table when row selection is changed
      datatable.on('select deselect', function () {
        datatable.state.save()
      })

      // hide search inputs as needed in responsive/list mode when resizing
      datatable.on('responsive-resize', function (e, datatable, columns) {
        hideSearchInputs(columns)
      })

      // a language file has been loaded asynch
      // this only happens when a non-english language is loaded
      datatable.on('i18n', function () {
        // and we need to ensure Filter Observer is in place
        setTimeout(initFilterObserver(), 100)
      })

      initFilterObserver()

      // update footer sortinfo when sorting
      datatable.on('order.dt', function () {
        const sortOrder = datatable.order()
        if (!sortOrder.length) {
          return
        }
        gsortInfo = '<b> ' + that._('Sort') + '</b> <i id="sortinfoicon" class="fa fa-info-circle" title="' +
            that._('Press SHIFT key while clicking on\nsort control for multi-column sort') + '"</i> : '
        sortOrder.forEach((sortcol, idx) => {
          const colText = datatable.column(sortcol[0]).name()
          gsortInfo = gsortInfo + colText +
                      (sortcol[1] === 'asc'
                        ? ' <span class="glyphicon glyphicon-sort-by-attributes"></span> '
                        : ' <span class="glyphicon glyphicon-sort-by-attributes-alt"></span> ')
        })
        $('div.sortinfo').html(gsortInfo)
      })
    }
  }
})
// END MAIN

// register column.name() DataTables API helper so we can refer to columns by name
// instead of column index number
$.fn.dataTable.Api.registerPlural('columns().names()', 'column().name()', function (setter) {
  return this.iterator('column', function (settings, column) {
    const col = settings.aoColumns[column]

    if (setter !== undefined) {
      col.sName = setter
      return this
    } else {
      return col.sName
    }
  }, 1)
})

// shake animation
function animateEl (element, animation, complete) {
  if (!(element instanceof jQuery) || !$(element).length || !animation) return null

  if (element.data('animating')) {
    element.removeClass(element.data('animating')).data('animating', null)
    element.data('animationTimeout') && clearTimeout(element.data('animationTimeout'))
  }

  element.addClass('animated-' + animation).data('animating', 'animated-' + animation)
  element.data('animationTimeout', setTimeout(function () {
    element.removeClass(element.data('animating')).data('animating', null)
    complete && complete()
  }, 400))
}

// custom error handler instead of default datatable alert error
// this often happens when invalid datastore_search queries are returned
$.fn.dataTable.ext.errMode = 'none'
$('#dtprv').on('error.dt', function (e, settings, techNote, message) {
  console.log('DataTables techNote: ', techNote)
  console.log('DataTables error msg: ', message)

  if (techNote === 6) {
    // possible misaligned column headers, refit columns
    const api = new $.fn.dataTable.Api(settings)
    api.columns.adjust().draw(false)
  } else {
    // errors are mostly caused by invalid FTS queries. shake input
    const shakeElement = $(':focus')
    animateEl(shakeElement, 'shake')
  }
})
