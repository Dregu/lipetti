var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();
document.addEventListener('deviceready', deviceReady, false);

function deviceReady() {
    deviceReadyDeferred.resolve();
}

$(document).on('mobileinit', function() {
    jqmReadyDeferred.resolve();
    $.mobile.defaultPageTransition   = 'none';
    $.mobile.defaultDialogTransition = 'none';
    $.mobile.buttonMarkup.hoverDelay = 0;
});

$.when(deviceReadyDeferred, jqmReadyDeferred).then(ready);

function ready() {
    nfc.addTagDiscoveredListener(
        // Callback
        function(nfcEvent) {
            var uid = nfc.bytesToHexString(nfcEvent.tag.id);
            tag(uid);
        },
        // Listener start
        function() {
            login();
            //alert('Waiting for tag');
        },
        // Listener error
        function(error) {
            alert('Error ' + JSON.stringify(error));
        }
    );
}