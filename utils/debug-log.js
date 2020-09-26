const debugLog = {
    debugOn : true,
    log : function( data ) {
        if( debugLog.debugOn )
            console.log( data );
    }
}

module.exports = debugLog;