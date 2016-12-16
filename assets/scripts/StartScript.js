if (!window.io) {
    cc.error('You should import the socket.io.js as a plugin!');
}

// cc.globalObj = require("GlobalUtil")

cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,      // The default value will be used only when the component attaching
        //                           to a node for the first time
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
    },

    // use this for initialization
    onLoad: function () {
        cc.director.setDisplayStats(true);
        cc.gameData = {};
    },

    loadChoiceScene: function() {
        if(!cc.globalObj.socket){
            this.socket = io.connect("http://localhost:5555", {"force new connection" : true});
            this.socket.on("connect", this.onConnect.bind(this));
        } else {
            cc.director.loadScene("ChoiceScene");
        }  
    },

    onConnect: function () {
        cc.globalObj.socket = this.socket;
        this.socket.on("connection", this.onConnection.bind(this)); 
    },

    onConnection: function(data) {
        data = cc.globalObj.parseStringToJson(data);
        cc.gameData.player = data.player;
        cc.director.loadScene("ChoiceScene");
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
    onDestroy:function(){
        this.socket.removeAllListeners('connection');
    },

});
