
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
        weight: 3,
    }

    var self = this;

    $("#get-address-btn").click(function(e) {
        state.addresses = [];
        self.setSeed();

        // Deterministically generates a new address for the specified seed with a checksum
        for(var i=0; i<10; i++) {
            var addr = iota.api._newAddress( state.seed, i, 2, true);
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

    $("#header").click(function(e){
        iota.fe.newTestnetMilestome();
    })

    $("#btc-claim-ext-address").click(function(e) {
        self.registerBtcAddress("btc")
    });

    $("#eth-claim-ext-address").click(function(e) {
        self.registerBtcAddress("btc")
    });

    self.setSeed = function() {
        state.seed = $("#get-address").val();
        state.seedTrytes = iota.pluginUtils.asciiToTrytes.toTrytes(self.seed);
    }

    self.registerBtcAddress = function(prefix) {
        self.setSeed();
        var extAddress = $("#" + prefix + "-ext-address").val();
        var intAddress = $("#" + prefix + "-int-address").val();
        console.log("Getting external addr", extAddress);
        var mappedAddress = iota.pluginUtils.externalToInternalAddress(extAddress); 
        console.log("Got external add converted ", mappedAddress);
        iota.fe.sendExternalAddressClaim(state.seed, 4, state.weight, {address: mappedAddress, security:2, key:0}, intAddress, 
            function(res) {
                console.log("ExternalAddressClaim", res);
            });
    }

})(jQuery);