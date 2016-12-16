
var TankData = require("TankData");

var TankType = TankData.tankType;
var PlayerType = TankData.playerType;

cc.Class({
    extends: cc.Component,

    properties: {

        //坦克类型
        tankType: {
            default: TankType.normal,
            type: TankType
        }, 
        //速度
        speed: 20,
        //子弹
        bullet: cc.Prefab,
        //发射子弹间隔时间
        fireTime: 0.5,
        //血量
        blood: 1,
        //所属组织
        team: 0,
        //爆炸动画
        blast: cc.Prefab,
        //射击音效
        shootAudio: {
            default: null,
            url: cc.AudioClip,
        },
        playerID: {
            default: -1,
            visible: false
        },

        die: false,

    },

    // use this for initialization
    onLoad: function () {
        //获取组件
        this._cityCtrl = cc.find("/CityScript").getComponent("CityScript");
        this.bulletNode = cc.find("/Canvas/Map/bullet");
    },

    start: function() {
        console.log("==========speed:"+this.speed);
        //初始是停止状态的
        this.stopMove = true;
        //偏移量
        this.offset = cc.v2();
    },

    //添加坦克移动动作
    tankMoveStart: function (angle) {

        cc.globalObj.socket.emit("rotation", { angle: 90 - angle });

        if(angle==0 || angle==180 || angle==90){
            this.offset = cc.v2(Math.floor(Math.cos(Math.PI/180*angle)), 
                           Math.floor(Math.sin(Math.PI/180*angle)));
        }else if(angle==270){

            this.offset = cc.v2(Math.ceil(Math.cos(Math.PI/180*angle)),
                                Math.floor(Math.sin(Math.PI/180*angle)));
        }else {
            this.offset = cc.v2(Math.cos(Math.PI/180*angle),
                                Math.sin(Math.PI/180*angle));
        }

        this.stopMove = false;
    },

    //移除坦克移动动作
    tankMoveStop: function () {
        this.stopMove = true;
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        if(this.die){
            return;
        }
        if(!this.stopMove){
            var boundingBox = this.node.getBoundingBox();
            var rect = cc.rect(boundingBox.xMin + this.offset.x*this.speed*dt*1.5,
                               boundingBox.yMin + this.offset.y*this.speed*dt*1.7, 
		                       boundingBox.size.width, 
                               boundingBox.size.height);
            if(this._cityCtrl.collisionTest(rect) //检测与地图的碰撞
                || this.collisionTank(rect)
                ){
                this.tankMoveStop();
            }else {
                var nextX = this.node.x + this.offset.x*this.speed*dt;
                var nextY = this.node.y + this.offset.y*this.speed*dt;
                cc.globalObj.socket.emit("move", { pos: { x: nextX, y: nextY } });
            }
        }
        if(this.stopFire){
            this.fireTime -= dt;
            if(this.fireTime<=0){
                this.stopFire = false;
            }
        }

    },

    //判断是否与其他坦克碰撞
    collisionTank: function(rect) {
        for(var i=0; i<cc.gameData.tankList.length; i++){
            var tank = cc.gameData.tankList[i]
            if(this.node === tank){
                continue;
            }
            var boundingBox = tank.getBoundingBox();
            if(cc.rectIntersectsRect(rect, boundingBox)){
                return true;
            }
        }
        return false;
    },

    //开火
    startFire: function (bulletPool){
        if(this.stopFire){
            return false;
        }
        this.stopFire = true;
        this.fireTime = 0.5;

        var bullet = null;
        if(bulletPool.size()>0){
            bullet = bulletPool.get(bulletPool);
        }else {
            bullet = cc.instantiate(this.bullet);
        }
        //设置子弹位置,角度
        bullet.rotation = this.node.rotation;
        var pos = this.node.position;

        var angle = 90 - this.node.rotation;
        var offset = cc.v2(0, 0);
        if(angle==0 || angle==180 || angle==90){
            offset = cc.v2(Math.floor(Math.cos(Math.PI/180*angle)), 
                                Math.floor(Math.sin(Math.PI/180*angle)));
        }else if(angle==270){
            offset = cc.v2(Math.ceil(Math.cos(Math.PI/180*angle)),
                                Math.floor(Math.sin(Math.PI/180*angle)));
        }else {
            offset = cc.v2(Math.cos(Math.PI/180*angle),
                                Math.sin(Math.PI/180*angle));
        }
        bullet.position = cc.pAdd(pos,cc.v2(10*offset.x, 10*offset.y));

        var bulletCtrl = bullet.getComponent("BulletScript");

        bulletCtrl.bulletMove();
        bulletCtrl.playerID = this.playerID;

        bullet.parent = this.bulletNode;
        //子弹标记
        bullet.tag = this.team;

        //加到列表
        cc.gameData.bulletList.push(bullet);

        return true;
    },

    //爆炸
    boom: function(){
        var blast = cc.instantiate(this.blast);
        blast.parent = this.node.parent;
        blast.position = this.node.position;
        var anim = blast.getComponent(cc.Animation);
        anim.play();
    },

});
