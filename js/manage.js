
var BTC_DISPLAY_RATIO = 100000000;
var ETH_DISPLAY_RATIO = 1000000000000;

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
        seed: null,
        addresses: null,
        weight: 3,
        externalAddressClaimHash: {},
        watchers: {},
        exchange: {},
        claim: {
            claimValue: null,
            claimAddress: null,
            claimHash: null,
            sendValue: null,
            sendAddress: null,
            toAddress: null,
        },
        externalExchange: {},
        balance: null,
        balanceDetails: {},
    }

    var self = this;

    $("#get-address-btn").click(function(e) {
        self.generateAddresses();
    });

    self.txCurrencyToStr = function(val, idx) {
        if (idx === 1) {
            return (val / BTC_DISPLAY_RATIO) + " BTC";
        }

        if (idx === 2) {
            return (val / ETH_DISPLAY_RATIO) + " ETH";
        }
    }

    self.updateAddressHTML = function() {
        var self=this;
        console.log(state.addresses);
        var ht = "";
        state.addresses.forEach(function(addr, i) {
            var addrStr = addr;
            if (state.balanceDetails[addr]) {
                var value = state.balanceDetails[addr];
                value.forEach(function(val, i) {
                    if (val !== 0) {
                        addrStr = addrStr + " (" + self.txCurrencyToStr(val, i) + ")";
                    }
                });
                if (iota.txCurrency.isNonZero(value)) {
                    addrStr = "<B>" + addrStr + "</B>";
                }
            }
            console.log(addrStr)
            ht += "<li>" + addrStr + "</li>";
        });
        $("#address-list").html(ht);
        $("#your-addresses").removeClass("thisone");
        $("#your-addresses").addClass("thisone");

        setScroller()
    }

    $("#header").click(function(e){
        self.updateBalance();
    })

    $("#btc-claim-ext-address").click(function(e) {
        self.registerBtcAddress("btc")
    });

    $("#eth-claim-ext-address").click(function(e) {
        self.registerBtcAddress("eth")
    });

    $("#btc-claim-btn").click(function(e) {
        self.claimBitcoin("btc");
    })

    $("#eth-claim-btn").click(function(e) {
        self.claimBitcoin("eth");
    })

    self.valueFor = function(value, unit) {
            var empty = iota.txCurrency.empty();
            if (unit === "BTC") {
                empty[1] = value * BTC_DISPLAY_RATIO;
            } else if (unit === "ETH") {
                empty[2] = value * ETH_DISPLAY_RATIO;
            }
            return empty;
    }

    $("#exchange-btn").click(function(e) {
        state.exchange = {
            from: $("#exchange-from").val(),
            to: $("#exchange-to").val(),
            rollback: $("#exchange-rollback").val(),
            value: self.valueFor($("#exchange-value").val(), $("#exchange-unit").val()),
            condition_value: self.valueFor($("#exchange-condition-value").val(), $("#exchange-condition-unit").val()),
        }
        self.exchangeBitcoin();
    });

    $("#claim-btn").click(function(e) {
        // bobInput, sendValue, aliceAddress, claimValue, claimerAddress, claimHash
        state.claim = {
            claimValue: self.valueFor($("#claim-value").val(), $("#claim-unit").val()),
            claimAddress: $("#claim-address").val(),
            claimHash: $("#claim-hash").val(),
            sendValue: self.valueFor($("#claim-send-value").val(), $("#claim-send-unit").val()),
            sendAddress: $("#claim-send-address").val(),
            toAddress: $("#claim-to-address").val(),
        }

        self.exchangeClaim();
    });

    $("#cash-out-btn").click(function(e) {
        // (seed, aliceInput, feValue, aliceClaimerAddress, bobClaimerAddress, aliceExternalAddress, bobExternalAddress, futureTime, callback)
        state.externalExchange = {
            feValue: self.valueFor($("#cash-out-value").val(), $("#cash-out-unit").val()),
            aliceInput: $("#cash-out-from").val(),
            bobClaimerAddress: $("#cash-out-to").val(),
            aliceClaimerAddress: $("#cash-out-rollback").val(),
            aliceExternalAddress: $("#cash-out-external-address-to").val(),
            bobExternalAddress: $("#cash-out-external-address-from").val(),
            futureTime: Math.floor(Date.now() / 1000) + Number($("#cash-out-timeout").val()),
        }

        console.log("externalExchagne", state.externalExchange);
        self.externalExchange();
    });

    self.setSeed = function() {
        state.seed = $("#get-address").val();
        state.seedTrytes = iota.pluginUtils.asciiToTrytes.toTrytes(self.seed);
    }

    self.generateAddresses = function() {
        state.addresses = [];
        self.setSeed();

        // Deterministically generates a new address for the specified seed with a checksum
        for(var i=0; i<10; i++) {
            var addr = iota.api._newAddress( state.seed, i, 2, true);
            state.addresses.push(addr);
        }
        self.updateAddressHTML();
    }

    self.updateBalance = function() {
        setTimeout(function() {
        iota.fe.newTestnetMilestome(function(e, res) {
            if (e) {
                console.error(e);
                return;
            }
            self.getAccountInfo();
        });}, 1000);
    }

    self.registerBtcAddress = function(prefix) {
        self.setSeed();
        var statusId = "#" + prefix + "-external-address-claim-status";
        var extAddress = $("#" + prefix + "-ext-address").val();
        var intAddress = $("#" + prefix + "-int-address").val();
        $(statusId).text("...")
        var extSeed = iota.pluginUtils.asciiToTrytes.toTrytes(extAddress);
        while(extSeed.length < 81) {
            extSeed += "9";
        }
        var mappedAddress = iota.pluginUtils.externalToInternalAddress(extAddress); 
        iota.fe.sendExternalAddressClaim(extSeed, 4, state.weight, {address: mappedAddress, security:2, key:0}, intAddress, 
            function(e, res) {
                if (e) {
                    console.error(e);
                    return;
                }
                console.log("ExternalAddressClaim", res);
                var bundleHash = res[0].hash;
                state.externalAddressClaimHash[prefix] = bundleHash;
                console.log("Bundle Hash Found", bundleHash);
                self.watchTransaction(statusId, bundleHash);
            });
    }

    self.claimBitcoin = function(prefix) {
        self.setSeed();
        var statusId = "#" + prefix + "-claim-status";
        var amount = Number($("#" + prefix + "-claim-value").val());
        var proof = $("#" + prefix + "-claim-proof").val();
        var intAddress = $("#" + prefix + "-int-address").val();
        var claimHash = state.externalAddressClaimHash[prefix];

        var value = iota.txCurrency.empty();
        value[(prefix === 'btc') ? 1 : 2] = amount;

        iota.fe.sendExternalClaim(state.seed, 4, state.weight, intAddress, value, claimHash, proof, function(e, res) {
            if (e) {
                console.error(e);
                return;
            }
            console.log(res);
            var hash = res[0].hash;
            console.log("WATCHING", hash);
            self.watchTransaction(statusId, hash);
        });
    }

    self.exchangeBitcoin = function() {
        self.setSeed();
        fromInput = {address: state.exchange.from, security: 2, keyIndex: 0};
        iota.fe.sendExchangeTransaction(state.seed, 4, state.weight, fromInput, state.exchange.rollback, state.exchange.to, state.exchange.value, state.exchange.condition_value, function(e, res) {
            if (e) {
                console.error(e);
                return;
            }
            console.log("ECHANGE", res);
            self.watchTransaction("#exchange-status", res[0].hash)
            $("#exchange-hash").text(res[0].hash);
            $("#claim-hash").val(res[0].hash);
        });
    }

    self.exchangeClaim = function() {
        self.setSeed();
        var fromInput = {address: state.claim.sendAddress, security: 2, keyIndex: 0};
        // seed, depth, minWeightMagnitude, bobInput, sendValue, aliceAddress, claimValue, claimerAddress, claimHash, callback) {
        iota.fe.sendClaimTransaction(state.seed, 4, state.weight, 
            fromInput,
            state.claim.sendValue, state.claim.toAddress, state.claim.claimValue, 
            state.claim.claimAddress, state.claim.claimHash, function(e, res) {
            if (e) {
                return console.error(e);
            }
            console.log("ECHANGE_CLAIM", res);
            self.watchTransaction("#claim-status", res[0].hash)
        });
    }

    self.externalExchange = function() {
        // state.externalExchange = {
        //     feValue: self.valueFor($("#cash-out-value").val(), $("#cash-out-unit").val()),
        //     aliceInput: $("cash-out-from").val(),
        //     bobClaimerAddress: $("#cash-out-to").val(),
        //     aliceClaimerAddress: $("cash-out-rollback").val(),
        //     aliceExternalAddress: $("#cash-out-external-address-to").val(),
        //     bobExternalAddress: $("#cash-out-external-address-from").val(),
        //     futureTime: ((new Date).getTime() / 1000) + Number($("#cash-out-timeout").val()),
        // }
        self.setSeed();
        var aliceInput = {address: state.externalExchange.aliceInput, security: 2, keyIndex: 0};
        // seed, depth, minWeightMagnitude, aliceInput, feValue, aliceClaimerAddress, bobClaimerAddress, aliceExternalAddress, bobExternalAddress, futureTime, callback
        var ex = state.externalExchange;
        iota.fe.sendExternalFutureExchange(state.seed, 4, state.weight, aliceInput, ex.feValue, 
            ex.aliceClaimerAddress, ex.bobClaimerAddress, ex.aliceExternalAddress, ex.bobExternalAddress, ex.futureTime, function(e, res) {
                if (e) {
                    return console.error(e);
                }
                console.log("EXTERNAL_FUTURE_EXCHANGE", res);
                self.watchTransaction("#cash-out-status", res[0].hash)
            });
    }

    self.watchTransaction = function(statusId, bundleHash) {
        var pinger = [null] 
        var updateIt = function() {
            $(statusId).removeClass("badge")
            $(statusId).addClass("badge");
            iota.api.getLatestInclusion([bundleHash], function(e, res) {
                if (e) { console.error(e); return; }
                console.log("getInclusionStates", res);
                var included = res.length && res[0];
                if (included) {
                    $(statusId).addClass("badge-success");
                    $(statusId).text("confirmed")
                    clearInterval(pinger[0]);
                    self.getAccountInfo();
                } else {
                    $(statusId).addClass("badge-default");
                    $(statusId).text("pending");
                }
            })
        };
        var lastWatcher = state.watchers[statusId];
        if (lastWatcher) {
            clearInterval(lastWatcher);
        }
        pinger[0] = window.setInterval(updateIt, 1000);
        state.watchers[statusId] = pinger[0];
        updateIt();
        self.updateBalance();
    }

    self.getAccountInfo = function() {
        var self = this;
        self.setSeed();
        if (!state.seed) {
            console.log("Seed is not set")
            return
        }

        if (!state.addresses) {
            self.generateAddresses();
        }

        // Get the correct balance count of all addresses
        iota.api.getBalances(state.addresses, 100, function(error, balances) {

            if (error) {
                return console.log(error);
            }
            console.log("Account data", balances);
            if (!balances) return;

            var totalBalance = iota.txCurrency.empty();
            var balanceDetails = {};

            balances.balances.forEach(function(balance, index) {

                var balanceArr = iota.txCurrency.parseFromOneString(balance);
                balanceDetails[state.addresses[index]] = balanceArr;

                totalBalance = iota.txCurrency.add(totalBalance, balanceArr);
            });

            state.balance = totalBalance;
            state.balanceDetails = balanceDetails;
            self.updateBalanceHTML();
            self.updateAddressHTML();

        });
    }

    self.updateBalanceHTML = function() {
        $(".balance-btc").text(state.balance[1]/BTC_DISPLAY_RATIO);
        $(".balance-eth").text(state.balance[2]/ETH_DISPLAY_RATIO);
    }

})(jQuery);
