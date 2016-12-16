
var _parseStringToJson = function(data){
    if (CC_JSB) {
        console.log(data);
        return eval('('+data+')');
    }else{
        return data;
    }

    
};

cc.globalObj = {}
cc.globalObj.parseStringToJson = _parseStringToJson;

// module.exports = {
//     parseStringToJson: _parseStringToJson
// }