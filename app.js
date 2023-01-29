var fs = require('fs');
var accessLog = fs.createWriteStream('access.log', { flags: 'a' });
var errorLog = fs.createWriteStream('error.log', { flags: 'a' });
var express = require('express');//生成一个express实例app
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var app = express();
var serveStatic = require('serve-static');
var serveIndex = require('serve-index');

//引入路由控制
var routes = require('./routes/index');

//引入数据库
var settings = require('./settings');

var flash = require('connect-flash');

var MongoStore = require('connect-mongo')(session);

// app.use(session({
//     secret: settings.cookieSecret,
//     cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
//     url: settings.url
// }));

app.use(session({
    secret: settings.cookieSecret,
    key: settings.db,//cookie name
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 },//30 days
    url: settings.url
}));

//设置服务端口号
app.set('port', process.env.PORT || 8080);

//设置views文件夹为存放试图文件目录
app.set('views', path.join(__dirname, 'views'));

//设置ejs为模板引擎
app.set('view engine', 'ejs');

app.use(flash());

//设置favicon图标
app.use(favicon(__dirname + '/public/favicon.ico'));


//加载日志中间件
app.use(logger('dev'));
app.use(logger({ stream: accessLog }));

//加载解析json的中间件
app.use(bodyParser.json());

//加载解析urlencoded请求体的中间件
app.use(bodyParser.urlencoded({ extended: true }));

//加载解析cookie的中间件
app.use(cookieParser());

//设置public文件夹为静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (err, req, res, next) {
    var meta = '[' + new Date() + '] ' + req.url + '\n';
    errorLog.write(meta + err.stack + '\n');
    next();
});

//启用路由控制
routes(app);

function getIPAdress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}
var ipAdress = getIPAdress()

app.use(serveStatic('public/', { 'index': ['index.html'] }));
app.use(serveIndex('public/', { 'icons': true }));

//服务启动成功提示
app.listen(app.get('port'), function () {
    console.log('Express server listening on port http://' + ipAdress + ':' + app.get('port'));
    // var uri = 'http://localhost:' + app.get('port');
    // opn(uri)
});
