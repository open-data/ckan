/* Watches the "Show metadata diff" button on the Changes summary page.
 * When the button is pressed, toggles the display of the metadata diff
 * for the chronologically most recent revision on and off.
 *
 * target - a button to watch for changes (default: button)
 *
 */

ckan.module('metadata-button', function(jQuery) {
  return {
    options: {
      target: 'button',
      // (canada fork only): i18n support, TODO: upstream contrib!!
      hideLabel: 'Hide metadata diff',
      showLabel: 'Show metadata diff',
    },

    initialize: function () {
      // Watch for our button to be clicked.
      this.el.on('click', jQuery.proxy(this._onClick, this));
    },

    _onClick: function(event) {
      // (canada fork only): CSP supported JS
      let div = document.getElementById("metadata_diff");
      let btn = document.getElementById("metadata_button");
      if( ! $(div).hasClass('show') ){
        $(div).removeClass('hide').addClass('show');
        btn.value = this.options.hideLabel;
      }else{
        $(div).removeClass('show').addClass('hide');
        btn.value = this.options.showLabel;
      }
    }
  }
});
