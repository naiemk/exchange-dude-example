
(function($){
    var require = require || function(){
        var iota = new IOTA({
            'host': 'http://localhost',
            'port': 14265
        });
        return iota;    
    };

    "use strict";
    iota = require("../iota/dist/iota")

    var state = {

    }

    var self = this;

    $("#get-address-btn").click(function(e) {
        state.addresses = [];
        self.seed = $("#get-address").val();

        // Deterministically generates a new address for the specified seed with a checksum
        for(var i=0; i<10; i++) {
            var addr = iota.api._newAddress( self.seed, i, 2, true);
            state.addresses.push(addr);
        }
        self.updateAddressHTML();
    });

    self.updateAddressHTML = function() {
        console.log(state.addresses);
        var ht = "";
        state.addresses.forEach(function(addr, i) {
            console.log(addr)
            ht += "<li>" + addr + "</li>";
        });
        $("#address-list").html(ht);
    }

    $("#btc-claim-ext-address").click(function(e) {
        self.registerBtcAddress("btc")
    });

    $("#eth-claim-ext-address").click(function(e) {
        self.registerBtcAddress("btc")
    });

    self.registerBtcAddress = function(prefix) {
        var extAddress = $("#" + prefix + "-ext-address").val();
        var intAddress = $("#" + prefix + "-int-address").val();
        console.log("Getting external addr", extAddress);
        var mappedAddress = iota.pluginUtils.externalToInternalAddress(extAddress); 
        console.log("Got external add converted ", mappedAddress);
        iota.fe.sendExternalAddressClaim(self.seed, 4, 18, {address: mappedAddress, security:2, key:0}, intAddress, 
            function(res) {
                console.log("ExternalAddressClaim", res);
            });
    }

})(jQuery);