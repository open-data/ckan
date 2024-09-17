/* Table toggle more
 * When a table has more things to it that need to be hidden and then shown more
 */
this.ckan.module('table-toggle-more', function($) {
  return {
    /* options object can be extended using data-module-* attributes */
    options: {
      // (canada fork only): jquery issues fix
      showLabel: null,
      hideLabel: null
    },

    /* Initialises the module setting up elements and event listeners.
     *
     * Returns nothing.
     */
    initialize: function () {
      $.proxyAll(this, /_on/);
      this.el.addClass('table-toggle-more');
      // Do we actually want this table to expand?
      var rows = $('.toggle-more', this.el).length;
      if (rows) {
        // How much is the colspan?
        var cols = $('thead tr th', this.el).length;
        // (canada fork only): jquery issues fix
        let showLabel = this._('Show more');
        if( this.options.showLabel != null ){
          showLabel = this.options.showLabel;
        }
        let hideLabel = this._('Hide');
        if( this.options.hideLabel != null ){
          hideLabel = this.options.hideLabel;
        }
        var template_more = [
          '<tr class="toggle-show toggle-show-more">',
          '<td colspan="'+cols+'">',
          '<small>',
          '<a href="javascript:void(0);" class="show-more">' + showLabel + '</a>',
          '<a href="javascript:void(0);" class="show-less">' + hideLabel + '</a>',
          '</small>',
          '</td>',
          '</tr>'
        ].join('\n');
        var template_seperator = [
          '<tr class="toggle-seperator">',
          '<td colspan="'+cols+'">',
          '</td>',
          '</tr>'
        ].join('\n');

        var seperator = $(template_seperator).insertAfter($('.toggle-more:last-child', this.el));
        $(template_more).insertAfter(seperator);
        // (canada fork only): jquery issues fix
        function _bindButtons(_moduleElement){
          $('.show-more', _moduleElement).off('click.Show');
          $('.show-more', _moduleElement).on('click.Show', function(_event){
            _event.preventDefault();
            _moduleElement.removeClass('table-toggle-more').addClass('table-toggle-less');
          });
          $('.show-more', _moduleElement).off('keyup.Show');
          $('.show-more', _moduleElement).on('keyup.Show', function(_event){
            let keyCode = _event.keyCode ? _event.keyCode : _event.which;
            // enter key required for a11y
            if( keyCode == 13 ){
              _event.preventDefault();
              _moduleElement.removeClass('table-toggle-more').addClass('table-toggle-less');
            }
          });
          $('.show-less', _moduleElement).off('click.Hide');
          $('.show-less', _moduleElement).on('click.Hide', function(_event){
            _event.preventDefault();
            _moduleElement.removeClass('table-toggle-less').addClass('table-toggle-more');
          });
          $('.show-less', _moduleElement).off('keyup.Hide');
          $('.show-less', _moduleElement).on('keyup.Hide', function(_event){
            let keyCode = _event.keyCode ? _event.keyCode : _event.which;
            // enter key required for a11y
            if( keyCode == 13 ){
              _event.preventDefault();
              _moduleElement.removeClass('table-toggle-less').addClass('table-toggle-more');
            }
          });
        }
        _bindButtons(this.el);
        setTimeout(_bindButtons, 500, this.el);
      }
    },

    _onShowMore: function($e) {
      $e.preventDefault();
      this.el
        .removeClass('table-toggle-more')
        .addClass('table-toggle-less');
    },

    _onShowLess: function($e) {
      $e.preventDefault();
      this.el
        .removeClass('table-toggle-less')
        .addClass('table-toggle-more');
    }

  }
});
