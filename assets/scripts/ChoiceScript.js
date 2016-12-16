cc.Class({
    extends: cc.Component,

    properties: { 
        curTankLabel: cc.Label,
    },

    // use this for initialization
    onLoad: function () {
        cc.gameData.curTank = 1;
        this.updateCurTank(cc.gameData.curTank);

        this.socket = cc.globalObj.socket;
        this.socket.on("joinHouse", this.onJoinHouse.bind(this));
    },

    onJoinHouse: function (data) {
        data = cc.globalObj.parseStringToJson(data);
        if(data.result){
            //跳转到游戏界面
            cc.director.loadScene("CityScene");
        }
        
    },

    onPlay: function () {
        var self = this;
        cc.loader.onProgress = function (completedCount, totalCount, item){
            // console.log(completedCount+"/"+totalCount);
        };
        cc.director.preloadScene("CityScene", function (assets, error){
            //进入房间
            self.socket.emit('joinHouse',{ tankType: cc.gameData.curTank });
            //显示等待状态

        });
    },

    onUp: function () {
        if(cc.gameData.curTank-1 <= 0){
            return;
        }
        cc.gameData.curTank -= 1; 
        this.updateCurTank(cc.gameData.curTank);
    },

    onNext: function () {
        if(cc.gameData.curTank+1 > 3){
            return;
        }
        cc.gameData.curTank += 1; 
        this.updateCurTank(cc.gameData.curTank);
    },

    updateCurTank: function (tankIndex) {
        this.curTankLabel.string = "Tank "+ tankIndex;
    },

    onDestroy:function(){
        this.socket.removeAllListeners('joinHouse');
    },


    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
