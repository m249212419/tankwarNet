var TankData = require("TankData");

var TankType = TankData.tankType;
var PlayerType = TankData.playerType;

cc.Class({
    extends: cc.Component,

    properties: {

        //地图
        curMap: cc.TiledMap,
        //摇杆
        yaogan: cc.Node,

        //子弹预制体
        bullet: cc.Prefab,
        //坦克预制体
        tank: {
            default: null,
            type: cc.Prefab,
        },
        //最大数量
        maxCount: 5,
        //出生地
        bornPoses: {
            default: [],
            type: cc.Vec2,
        },
        //坦克皮肤
        spriteFrames: {
            default: [],
            type: cc.SpriteFrame,
        },
        //坦克移动速度
        tankSpeeds: {
            default: [],
            type: cc.Float,
        },
        //坦克子弹发射间隔时间
        tankFireTimes: {
            default: [],
            type: cc.Float,
        },

        //坦克血量
        tankBloods: {
            default: [],
            type: cc.Integer,
        },
        

    },

    // use this for initialization
    onLoad: function () {
        //获取摇杆控制组件
        this._joystickCtrl = this.yaogan.getComponent("JoystickCtrl");
        //获取地图 TiledMap 组件
        this._tiledMap = this.curMap.getComponent('cc.TiledMap');
    },

    start: function(err){
        if(err){
            return;
        }

        //默认角度
        this.curAngle = null;

        var self = this;
        //注册监听事件
        this.registerInputEvent();
        //引入地图数据
        this._tiledMapData = require("TiledMapData");

        //获取地图尺寸
        this._curMapTileSize = this._tiledMap.getTileSize();
        this._curMapSize = cc.v2(this._tiledMap.node.width,this._tiledMap.node.height);
        
        //地图墙层
        this.mapLayer0 = this._tiledMap.getLayer("layer_0");

        //初始化对象池(参数必须为对应脚本的文件名)
        this.bulletPool = new cc.NodePool("BulletScript");
        var initBulletCount = 20;
        for(var i=0; i<initBulletCount; ++i){
            var bullet = cc.instantiate(this.bullet);
            this.bulletPool.put(bullet);
        }

        this.tankPool = new cc.NodePool("TankScript");
        for(var i=0; i<this.maxCount; ++i){
            var tank = cc.instantiate(this.tank);
            this.tankPool.put(tank);
        }

        cc.gameData.playerNodes = {};
        
        this.socket = cc.globalObj.socket;
        this.socket.on("onload", this.onload.bind(this));
        this.socket.on("rotation", this.tankRotation.bind(this));
        this.socket.on("move", this.tankMove.bind(this));
        this.socket.on("attack", this.tankAttack.bind(this));
        this.socket.on("kill", this.tankBoom.bind(this));
        this.socket.on("exit", this.tankExit.bind(this));
        this.socket.on("gameOver", this.gameOver.bind(this));

        this.socket.emit("onload");

    },

    onload: function(data) {
        
        //地图内坦克列表
        cc.gameData.tankList = [];
        //地图内子弹列表
        cc.gameData.bulletList = [];

        //获取组件
        this.tankNode = cc.find("/Canvas/Map/tank");

        data = cc.globalObj.parseStringToJson(data);
        
        var players = data.players;

        for (var key in players) {
            var player = players[key];
            var node = this.addPlayerTank(player);
            cc.gameData.playerNodes[player.playerID] = node;
        }

    },

    //坦克转向
    tankRotation: function (data) {
        data = cc.globalObj.parseStringToJson(data);
        var angle = data.angle;
        if(data.team != cc.gameData.player.team){
            angle = data.angle + 180;  
        }
        var playerNode = cc.gameData.playerNodes[data.playerID];
        playerNode.rotation = angle;

    },

    //坦克移动
    tankMove: function (data) {
        data = cc.globalObj.parseStringToJson(data);
        var pos = data.pos;
        if(data.team != cc.gameData.player.team){
            pos.x = -pos.x;
            pos.y = -pos.y; 
        }
        var playerNode = cc.gameData.playerNodes[data.playerID];
        playerNode.x = pos.x;
        playerNode.y = pos.y;

    },

    //坦克攻击
    tankAttack: function(data) {
        data = cc.globalObj.parseStringToJson(data);
        var playerID = data.playerID;
        var playerNode = cc.gameData.playerNodes[data.playerID];
        var tankCtrl = playerNode.getComponent("TankScript");
        if(tankCtrl.startFire(this.bulletPool)){
            //播放射击音效
            cc.audioEngine.play(tankCtrl.shootAudio, false, 1);
        }

    },

    //注册输入事件
    registerInputEvent: function () {

        var self = this;

        this._joystickCtrl.addJoyStickTouchChangeListener(function (angle) {
            
            if(angle == self.curAngle &&
                !self._playerTankCtrl.stopMove ){
                return;
            }
            self.curAngle = angle;

            if(angle!=null){
                //开始前进
                self._playerTankCtrl.tankMoveStart(angle);
            }else {
                //停止前进
                self._playerTankCtrl.tankMoveStop();
            }

        });
        //按键按下
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, 
                        function (event) {
                            var angle = null;
                            switch(event.keyCode) {
                                case cc.KEY.w:
                                    angle = 90;
                                    break;
                                case cc.KEY.s:
                                    angle = 270;
                                    break;
                                case cc.KEY.a:
                                    angle = 180;
                                    break;
                                case cc.KEY.d:
                                    angle = 0;
                                    break;
                            }
                            if(event.keyCode == cc.KEY.k){
                                this.fireBtnClick();
                            }else {
                                self._playerTankCtrl.tankMoveStop();
                            }
                            if(angle!=null){
                                //开始前进
                                self._playerTankCtrl.tankMoveStart(angle);
                            }
                        }, this);
        //按键抬起
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, 
                        function (event){
                            //停止前进
                            if(event.keyCode != cc.KEY.k){
                                self._playerTankCtrl.tankMoveStop();
                            }
                        }, this);

    },

    //碰撞检测
    collisionTest: function(rect, bullet){
        //判断是否碰到地图边界
        if (rect.xMin <= -this._curMapSize.x/2 || rect.xMax >= this._curMapSize.x/2 ||
		    rect.yMin <= -this._curMapSize.y/2 || rect.yMax >= this._curMapSize.y/2){
                
            return true;
        }
        //判断是否撞墙
        //将坐标转换为地图坐标系
        var MinY = this._curMapSize.y/2 - rect.yMin;
	    var MaxY = this._curMapSize.y/2 - rect.yMax;
        var MinX = this._curMapSize.x/2 + rect.xMin;
        var MaxX = this._curMapSize.x/2 + rect.xMax;

        //获取四个角的顶点
        var LeftDown = cc.v2(MinX, MinY);
        var RightDown = cc.v2(MaxX, MinY);
        var LeftUp = cc.v2(MinX, MaxY);
        var RightUp = cc.v2(MaxX, MaxY);

        //获取四条边的中心点
        var MidDown = cc.v2(MinX+(MaxX-MinX)/2, MinY);
        var MidUp = cc.v2(MinX+(MaxX-MinX)/2, MaxY);
        var MidLeft = cc.v2(MinX, MinY+(MaxY-MinY)/2);
        var MidRight= cc.v2(MaxX, MinY+(MaxY-MinY)/2);

        //检测碰撞
        return this._collisionTest([LeftDown,RightDown,LeftUp,RightUp,
                        MidDown,MidUp,MidLeft,MidRight],
                        bullet);
    },

    //内部碰撞检测方法
    _collisionTest: function(points, bullet){
        var point = points.shift()
        var gid = this.mapLayer0.getTileGIDAt(cc.v2(parseInt(point.x / this._curMapTileSize.width),parseInt(point.y / this._curMapTileSize.height)));
        if (this._tiledMapData.gidToTileType[gid] != this._tiledMapData.tileType.tileNone && 
            this._tiledMapData.gidToTileType[gid] != this._tiledMapData.tileType.tileGrass){
            if(bullet && this._tiledMapData.gidToTileType[gid] == this._tiledMapData.tileType.tileWall){
                this.mapLayer0.removeTileAt(cc.v2(parseInt(point.x / this._curMapTileSize.width),parseInt(point.y / this._curMapTileSize.height)));
            }
            return true;
        }
        if(points.length>0){
            return this._collisionTest(points, bullet);
        }else{
            return false;
        }
    },

    //加入玩家坦克
    addPlayerTank: function(player) {

        if(this.tankPool.size()>0){
            var tank = this.tankPool.get();
            switch(player.tankType){
                case TankType.normal:
                    tank.getComponent(cc.Sprite).spriteFrame = this.spriteFrames[0];
                break;

                case TankType.speed:
                    tank.getComponent(cc.Sprite).spriteFrame = this.spriteFrames[1];
                break;

                case TankType.big:
                    tank.getComponent(cc.Sprite).spriteFrame = this.spriteFrames[2];
                break;

            }

            if(player.playerType == PlayerType.self
            || player.playerType == PlayerType.friend){
                tank.position = cc.v2(player.pos.x, player.pos.y);
            }else if(player.playerType == PlayerType.enemy){
                tank.position = cc.v2(-player.pos.x, -player.pos.y);
                tank.rotation = 180;
            }
            //获取坦克控制组件
            var tankCtrl = tank.getComponent("TankScript");
            tankCtrl.tankType = player.tankType;
            //设置坦克属性
            tankCtrl.speed = this.tankSpeeds[this.tankSpeeds.length-1];
            tankCtrl.fireTime = this.tankFireTimes[this.tankFireTimes.length-1];
            tankCtrl.blood = this.tankBloods[this.tankBloods.length-1];
            tankCtrl.die = false;
            tankCtrl.team = player.team;
            tankCtrl.playerID = player.playerID;

            if(player.playerType == PlayerType.self){
                this.playerTank = tank;
                this._playerTankCtrl = tankCtrl;

                cc.gameData.player.tankType = player.tankType;
                cc.gameData.player.team = player.team;
                
            }

            tank.parent = this.tankNode;
            //加到列表
            cc.gameData.tankList.push(tank);
            return tank;
        }
        return null;
    },

    tankBoom: function(data) {

        data = cc.globalObj.parseStringToJson(data);
        var tank = cc.gameData.playerNodes[data.enemyID];
        var tankCtrl = tank.getComponent("TankScript");
        tankCtrl.boom();
        tankCtrl.die = true;
        tank.parent = null;
        
        
        for(var i=0; i<cc.gameData.tankList.length; i++){
            if(cc.gameData.tankList[i] == tank){
                cc.gameData.tankList.splice(i, 1);
            }
        }

        this.tankPool.put(tank);
        if(tank == this.playerTank){
            // cc.gameData.playerNodes = {};
            // cc.director.loadScene("ChoiceScene");
        }
    },

    tankExit: function(data){
        data = cc.globalObj.parseStringToJson(data);
        var tank = cc.gameData.playerNodes[data.playerID];
        tank.parent = null;
        
        for(var i=0; i<cc.gameData.tankList.length; i++){
            if(cc.gameData.tankList[i] == tank){
                cc.gameData.tankList.splice(i, 1);
            }
        }
        this.tankPool.put(tank);

    },

    gameOver: function(data) {
        cc.gameData.playerNodes = {};
        cc.director.loadScene("ChoiceScene");
    },

    //开火按钮点击
    fireBtnClick: function(){
        if(this._playerTankCtrl.die){
            return;
        }
        // cc.director.loadScene("ChoiceScene");
        this.socket.emit("attack", { playerID: cc.gameData.player.playerID });
    },

    //销毁时调用
    onDestroy:function(){
        this.socket.removeAllListeners("onload");
        this.socket.removeAllListeners("rotation");
        this.socket.removeAllListeners("move");
        this.socket.removeAllListeners("attack");
        this.socket.removeAllListeners("kill");
        this.socket.removeAllListeners("exit");
        this.socket.removeAllListeners("gameOver");
    },
});
