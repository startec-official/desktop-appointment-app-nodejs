var debugOn = true;

var log = function( data ) {
    if( this.debugOn )
        console.log( data );
}

module.exports.debugOn = debugOn;
module.exports.log = log;