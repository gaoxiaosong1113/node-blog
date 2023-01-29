/*
 * @Author: Gaoxs
 * @Date: 2019-12-25 13:58:03
 * @LastEditors: Gaoxs
 * @LastEditTime: 2022-02-17 19:41:13
 * @Description: 
 */
var settings = require('../settings'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;
    
module.exports = new Db(settings.db, new Server(settings.host, settings.port), {safe: true});
