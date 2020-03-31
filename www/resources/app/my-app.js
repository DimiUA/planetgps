var storage;
var fail;
var uid;
try {
    uid = new Date;
    (storage = window.localStorage).setItem(uid, uid);
    fail = storage.getItem(uid) != uid;
    storage.removeItem(uid);
    fail && (storage = false);
} catch (exception) {
    window.localStorage.clear();
}

$hub = null;
window.NULL = null;
window.COM_TIMEFORMAT = 'YYYY-MM-DD HH:mm:ss';
window.COM_TIMEFORMAT2 = 'YYYY-MM-DDTHH:mm:ss';
window.COM_TIMEFORMAT3 = 'YYYY-MM-DDTHH:MM';
UTCOFFSET = moment().utcOffset();
function setUserinfo(user){localStorage.setItem("COM.QUIKTRAK.LIVE.USERINFO", JSON.stringify(user));}
function getUserinfo(){var ret = {};var str = localStorage.getItem("COM.QUIKTRAK.LIVE.USERINFO");if(str) {ret = JSON.parse(str);} return ret;}
function isJsonString(str){try{var ret=JSON.parse(str);}catch(e){return false;}return ret;}
function toTitleCase(str){return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});}

function guid() {
  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}


//alert('simple alert');
function getPlusInfo(){
    var uid = guid();
    if(window.device) {                        
        if(!localStorage.PUSH_MOBILE_TOKEN){
        localStorage.PUSH_MOBILE_TOKEN = uid;
        }       
        localStorage.PUSH_APP_KEY = BuildInfo.packageName;
        localStorage.PUSH_APPID_ID = BuildInfo.packageName; 
        localStorage.DEVICE_TYPE = device.platform;   
    }else{        
            if(!localStorage.PUSH_MOBILE_TOKEN)
            localStorage.PUSH_MOBILE_TOKEN = uid;
            if(!localStorage.PUSH_APP_KEY)
            localStorage.PUSH_APP_KEY = uid;
            if(!localStorage.PUSH_DEVICE_TOKEN)
            localStorage.PUSH_DEVICE_TOKEN = uid;
            //localStorage.PUSH_DEVICE_TOKEN = "75ba1639-92ae-0c4c-d423-4fad1e48a49d"
        localStorage.PUSH_APPID_ID = 'webapp';
        localStorage.DEVICE_TYPE = "webapp";        
    }
}

var inBrowser = 0;
var notificationChecked = 0;
var loginTimer = 0;
localStorage.loginDone = 0;
//var appPaused = 0;

var push = null;
var loginInterval = null;
var pushConfigRetryMax = 40;
var pushConfigRetry = 0;

if( navigator.userAgent.match(/Windows/i) ){    
    inBrowser = 1;
}
document.addEventListener("deviceready", onDeviceReady, false );

var AppDetails = {
    name: 'PlanetGPS-app',
    code: 20,
    supportCode: 3,
    appId: '',
    appleId: '1342233498',
};

function onDeviceReady(){
    if(BuildInfo){
        AppDetails.appId = BuildInfo.packageName;
    }
    if (cordova && cordova.InAppBrowser) {
        window.open = cordova.InAppBrowser.open;
    }
    //fix app images and text size
    if (window.MobileAccessibility) {
        window.MobileAccessibility.usePreferredTextZoom(false);    
    }

    
    //if (device.platform == 'iOS' && StatusBar) {
    if (StatusBar) {
        StatusBar.styleDefault();
    }   

    
    setupPush();

    getPlusInfo(); 

    if (!inBrowser) {
        if(getUserinfo().MinorToken) {
            //login(); 
            preLogin();   
        }
        else {
            logout();
        } 
    }

    document.addEventListener("backbutton", backFix, false); 
    document.addEventListener("resume", onAppResume, false);
    document.addEventListener("pause", onAppPause, false);

    
}

function setupPush(){
        push = PushNotification.init({
            "android": {
                //"senderID": "264121929701"                             
            },
            "browser": {
                pushServiceURL: 'https://push.api.phonegap.com/v1/push'
            },            
            "ios": {
                "sound": true,
                "vibration": true,
                "badge": true
            },
            "windows": {}
        });
        console.log('after init');

        push.on('registration', function(data) {
            console.log('registration event: ' + data.registrationId);  
            //$$('.regToken').val(JSON.stringify(data));
            //App.alert( JSON.stringify(data) );         

            //localStorage.PUSH_DEVICE_TOKEN = data.registrationId;
           
            var oldRegId = localStorage.PUSH_DEVICE_TOKEN;
            if (localStorage.PUSH_DEVICE_TOKEN !== data.registrationId) {               
                // Save new registration ID
                localStorage.PUSH_DEVICE_TOKEN = data.registrationId;
                // Post registrationId to your app server as the value has changed
                refreshToken(data.registrationId);
            }
        });

        push.on('error', function(e) {
            //console.log("push error = " + e.message);
            alert("push error = " + e.message);
        });

        push.on('notification', function(data) {            
            //alert( JSON.stringify(data) );


            //if user using app and push notification comes
            if (data && data.additionalData && data.additionalData.foreground) {
               // if application open, show popup    
               
               showMsgNotification([data.additionalData]);
            }
            else if (data && data.additionalData && data.additionalData.payload){
               //if user NOT using app and push notification comes                
                App.showIndicator();
                loginTimer = setInterval(function() {
                    //alert(localStorage.loginDone);
                    if (localStorage.loginDone) {
                        clearInterval(loginTimer);
                        setTimeout(function(){     
                            //alert('before processClickOnPushNotification');                       
                            processClickOnPushNotification([data.additionalData.payload]);
                            App.hideIndicator();             
                        },1000); 
                    }
                }, 1000); 
            }

            
            if (device && device.platform && device.platform.toLowerCase() == 'ios') {
                push.finish(
                    () => {
                      console.log('processing of push data is finished');
                    },
                    () => {
                      console.log(
                        'something went wrong with push.finish for ID =',
                        data.additionalData.notId
                      );
                    },
                    data.additionalData.notId
                );
            }            
                
        });

        if　(!localStorage.ACCOUNT){
            push.clearAllNotifications(
                () => {
                  console.log('success');
                },
                () => {
                  console.log('error');
                }
            );
        }
}

function onAppPause(){ 
    /*if ($hub) {
        $hub.stop();
    }*/
} 
function onAppResume(){    
    if (localStorage.ACCOUNT && localStorage.PASSWORD) {
        getNewNotifications(); 
        getNewData();
    }
   
    /*if ($hub) {
        $hub.start();
    }*/ 
}  

 

function backFix(event){
    var page=App.getCurrentView().activePage;        
    if(page.name=="index"){ 
        App.confirm(LANGUAGE.PROMPT_MSG015, function () {        
            navigator.app.exitApp();
        });
    }else{
        mainView.router.back();
    } 
}

// Initialize your app
var App = new Framework7({
    animateNavBackIcon: true,    
    swipeBackPage: false,    
    //pushState: true,       
    swipePanel: 'left', 
    allowDuplicateUrls: true,    
    sortable: false,    
    modalTitle: 'PlanetGPS',
    notificationTitle: 'PlanetGPS',
    precompileTemplates: true,
    template7Pages: true,
    onAjaxStart: function(xhr){
        App.showIndicator();
    },
    onAjaxComplete: function(xhr){
        App.hideIndicator();
    }   
});

// Export selectors engine
var $$ = Dom7;

// Add view
var mainView = App.addView('.view-main', {
    domCache: true,     
    dynamicNavbar: true,
});

window.PosMarker = {};
var MapTrack = null;
var StreetViewService = null;
var TargetAsset = {};
var searchbar = null;
var searchbarGeofence = null;
var virtualAssetList = null;
var virtualNotificationList = null;
var virtualGeofenceList = null;
var updateAssetsPosInfoTimer = false;
var trackTimer = false;
var pingTimer = false;
var playbackTimer = false;
var verifyCheck = {}; // for password reset
var POSINFOASSETLIST = {}; 
var HistoryArray = [];
var EventsArray = [];
var layerControl = false;
var playbackLayerGroup = false;
var playbackLayerGroupOpt = false;
var prevStatusLatLng = {
    'lat': 0,
    'lng': 0,
};

var geofenceMarkerGroup = false;
var AllMarkersGroup = false;
var GeofenceFiguresGroup = new L.FeatureGroup();

var API_DOMIAN1 = "https://api.m2mglobaltech.com/QuikTrak/V1/";
var API_DOMIAN2 = "";
var API_DOMIAN3 = "https://api.m2mglobaltech.com/QuikProtect/V1/";
var API_DOMIAN4 = "https://api.m2mglobaltech.com/Quikloc8/V1/";

var API_URL = {};
API_URL.URL_GET_LOGIN = API_DOMIAN1 + "User/Auth?username={0}&password={1}&appKey={2}&mobileToken={3}&deviceToken={4}&deviceType={5}";
API_URL.URL_GET_LOGOUT = API_DOMIAN1 + "User/Logoff2?mobileToken={0}&deviceToken={1}";
API_URL.URL_EDIT_ACCOUNT = API_DOMIAN1 + "User/Edit?MajorToken={0}&MinorToken={1}&FirstName={2}&SubName={3}&Mobile={4}&Phone={5}&EMail={6}";
//API_URL.URL_EDIT_DEVICE = API_DOMIAN1 + "Device/Edit?MinorToken={0}&Code={1}&name={2}&speedUnit={3}&initMileage={4}&initAccHours={5}&attr1={6}&attr2={7}&attr3={8}&attr4={9}&tag={10}&icon={11}";
API_URL.URL_EDIT_DEVICE = API_DOMIAN1 + "Device/Edit?MinorToken={0}&Code={1}&name={2}&speedUnit={3}&initMileage={4}&initAccHours={5}&attr1={6}&attr2={7}&attr3={8}&attr4={9}&tag={10}&icon={11}&MajorToken={12}&registration={13}&MaxSpeed={14}&stockNumber=";
//API_URL.URL_SET_ALARM = API_DOMIAN1 + "Device/AlarmOptions2?MinorToken={0}&imei={1}&options={2}";

API_URL.URL_SET_ALERT_CONFIG = API_DOMIAN1 + "Device/AlertConfigureEdit";
API_URL.URL_GET_ALERT_CONFIG = API_DOMIAN1 + "Device/GetAlertConfigure";

API_URL.URL_GET_POSITION = API_DOMIAN1 + "Device/GetPosInfo?MinorToken={0}&Code={1}";
API_URL.URL_GET_POSITION2 = API_DOMIAN1 + "Device/GetPosInfo2?MinorToken={0}&Code={1}";
API_URL.URL_GET_POSITION_ARR = API_DOMIAN1 + "Device/GetHisPosArray?MinorToken={0}&Code={1}&From={2}&To={3}";
API_URL.URL_GET_POSITION_ARR2 = "https://osrm.sinopacific.com.ua"; //"https://osrm.sinopacific.com.ua/playback/v4"; //https://osrm.sinopacific.com.ua
API_URL.URL_GET_ALL_POSITIONS = API_DOMIAN1 + "Device/GetPosInfos?MinorToken={0}";
API_URL.URL_GET_ALL_POSITIONS2 = API_DOMIAN1 + "Device/GetPosInfos2?MinorToken={0}&MajorToken={1}";
API_URL.URL_GET_POSITION_GPRS = API_DOMIAN1 + "Device/GprsCommand?MinorToken={0}&Code={1}&Cmd=update";
API_URL.URL_DELETE_HYSTORY = API_DOMIAN1 + "Device/clearHistory?MinorToken={0}&Code={1}";
API_URL.URL_RESET_PASSWORD = API_DOMIAN1 + "User/Password?MinorToken={0}&oldpwd={1}&newpwd={2}";
API_URL.URL_VERIFY_BY_EMAIL = API_DOMIAN3 + "Client/VerifyCodeByEmail?email={0}";
API_URL.URL_FORGOT_PASSWORD = API_DOMIAN3 + "Client/ForgotPassword?account={0}&newPassword={1}&checkNum={2}";
API_URL.URL_GET_NEW_NOTIFICATIONS = API_DOMIAN1 +"Device/Alarms?MinorToken={0}&deviceToken={1}";

API_URL.URL_GEOFENCE_ADD = API_DOMIAN1 + "Device/FenceAdd";
API_URL.URL_GET_GEOFENCE_LIST = API_DOMIAN1 + "Device/GetFenceList";
API_URL.URL_GEOFENCE_EDIT = API_DOMIAN1 + "Device/FenceEdit";
API_URL.URL_GEOFENCE_DELETE = API_DOMIAN1 + "Device/FenceDelete";
API_URL.URL_GET_GEOFENCE_ASSET_LIST = API_DOMIAN1 + "Device/GetFenceAssetList";
API_URL.URL_PHOTO_UPLOAD = "https://upload.quiktrak.co/image/Upload";
API_URL.URL_SUPPORT = "https://support.quiktrak.eu/?name={0}&loginName={1}&email={2}&phone={3}&s={4}";

API_URL.URL_GET_BALANCE = API_DOMIAN3 + "Client/Balance?MajorToken={0}&MinorToken={1}";
//API_URL.URL_SET_IMMOBILISATION = API_DOMIAN4 + "asset/Relay?MajorToken={0}&MinorToken={1}&code={2}&state={3}";
API_URL.URL_SET_IMMOBILISATION = API_DOMIAN4 + "asset/RelayNoPay?MajorToken={0}&MinorToken={1}&code={2}&state={3}";
API_URL.URL_SET_GEOLOCK = API_DOMIAN4 + "asset/GeoLock?MajorToken={0}&MinorToken={1}&code={2}&state={3}";

//API_URL.URL_ROUTE = "https://www.google.com/maps/dir/?api=1&destination={0},{1}"; //&travelmode=walking
API_URL.URL_ROUTE = "maps://maps.apple.com/maps?daddr={0},{1}"; // ios link
API_URL.URL_REFRESH_TOKEN = API_DOMIAN1 + "User/RefreshToken";

var cameraButtons = [
    {
        text: 'Take picture',
        color: 'dealer',
        onClick: function () {
            getImage(1);
        }
    },
    {
        text: 'From gallery',
        color: 'dealer',
        onClick: function () {
            getImage(0);
        }
    },
    {
        text: 'Cancel',
        color: 'red',
        onClick: function () {
            //App.alert('Cancel clicked');
        }
    },
];

//http://api.m2mglobaltech.com/QuikTrak/V1/User/Auth?username=tongwei&password=888888&appKey=UcPXWJccwm7bcjvu7aZ7j5&deviceType=android&deviceToken=deviceToken&mobileToken=mobileToken
//http://api.m2mglobaltech.com/QuikTrak/V1/User/Logoff2?username=tongwei&MinorToken=8944cbf0-7749-4c5e-bdba-8b7c4e47229b&MajorToken=f9087bb0-47ba-4d31-a038-ea676fdf0de2&mobileToken=push mobiletoken
//http://api.m2mglobaltech.com/QuikTrak/V1/User/Edit?MinorToken=8944cbf0-7749-4c5e-bdba-8b7c4e47229b&MajorToken=f9087bb0-47ba-4d31-a038-ea676fdf0de2&FirstName=Tong&SubName=Wei&Mobile=&Phone=&EMail=tony@quiktrak.net
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/Edit?MinorToken=588bcf33-1af5-4fb3-8939-0cbc8f949fb3&Code=6562656064&name=testname&speedUnit=KPH&initMileage=8&initAccHours=100&tag=testname1&attr1=Toyota &attr2=Landcruiser&attr3=Black&attr4=2010
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/GetPosInfo?MinorToken=588bcf33-1af5-4fb3-8939-0cbc8f949fb3&Code=6562656064
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/GetHisPosArray?MinorToken=588bcf33-1af5-4fb3-8939-0cbc8f949fb3&Code=6562656064&From=2017-02-11T10:00:00&To=2017-02-12T10:00:00
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/GetPosInfos?MinorToken=588bcf33-1af5-4fb3-8939-0cbc8f949fb3
//http://api.m2mglobaltech.com/QuikTrak/V1/User/Password?MinorToken=588bcf33-1af5-4fb&oldpwd=888888&newpwd=888888
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/FenceAdd
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/GetFenceList
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/FenceEdit
//http://api.m2mglobaltech.com/QuikTrak/V1/Device/FenceDelete

var html = Template7.templates.template_Login_Screen();
$$(document.body).append(html); 
html = Template7.templates.template_Popover_Menu();
$$(document.body).append(html);
/*html = Template7.templates.template_AssetList();
$$('.navbar-fixed').append(html);*/
$$('.index-title').html(LANGUAGE.MENU_MSG00);
$$('.index-search-input').attr('placeholder',LANGUAGE.COM_MSG06);
$$('.index-search-cancel').html(LANGUAGE.COM_MSG04);
$$('.index-search-nothing-found').html(LANGUAGE.COM_MSG05);
$$('.view-all-text').html(LANGUAGE.COM_MSG55);




if (inBrowser) {
    if(getUserinfo().MinorToken) {
        preLogin();     
    }
    else {
        logout();
    } 
}

virtualAssetList = App.virtualList('.assets_list', {
    // search item by item
    searchAll: function (query, items) {
        var foundItems = [];        
        for (var i = 0; i < items.length; i++) {           
            // Check if title contains query string
            if (items[i].Name.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0) foundItems.push(i);
        }
        // Return array with indexes of matched items
        return foundItems; 
    },       
    //List of array items
    items: [
    ],
    height: function (item) {
        var height = 77;
        if (POSINFOASSETLIST && POSINFOASSETLIST[item.IMEI]){
            height = 102.66;
            var asset = POSINFOASSETLIST[item.IMEI];
            var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);
            if (assetFeaturesStatus && assetFeaturesStatus.voltage && assetFeaturesStatus.fuel ||
                assetFeaturesStatus && assetFeaturesStatus.battery && assetFeaturesStatus.fuel ||
                assetFeaturesStatus && assetFeaturesStatus.battery && assetFeaturesStatus.voltage ||
                assetFeaturesStatus && assetFeaturesStatus.acc && assetFeaturesStatus.voltage) {
                height = 132.31;
            }
        }
        return height; //display the image with 50px height
    },
    // Display the each item using Template7 template parameter
    renderItem: function (index, item) {
        var ret = '';
        var asset = POSINFOASSETLIST[item.IMEI];        
        var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);
        var assetImg = getAssetImg(item, {'assetList':true});                 
             
        
        //console.log(assetFeaturesStatus.status.eventTime);
        if (assetFeaturesStatus && assetFeaturesStatus.stats) {
            

        	ret +=  '<li class="item-link item-content item_asset" data-imei="' + item.IMEI + '" data-id="' + item.Id + '">';                    
            ret +=      '<div class="item-media">'+assetImg+'</div>';
            ret +=      '<div class="item-inner">';
            ret +=          '<div class="item-title-row item-title-asse-name">';
            ret +=              '<div class="item-title">' + item.Name + '</div>';
            ret +=              '<div class="item-after">';
            ret +=                  '<i id="signal-state'+item.IMEI+'" class="icon-other-signal '+assetFeaturesStatus.GSM.state+'"></i>';
            ret +=                  '<i id="satellite-state'+item.IMEI+'" class="icon-other-satellite '+assetFeaturesStatus.GPS.state+'"></i>';
            ret +=              '</div>';
            ret +=          '</div>';

            ret +=          '<div class="item-title-row item-title-row-status">';
            ret +=              '<div class="item-title item-subtitle '+assetFeaturesStatus.status.state+'"><i class="icon-status-fix icon-other-asset"></i><span id="status-value'+item.IMEI+'">'+assetFeaturesStatus.status.value+'</span></div>';
            ret +=              '<div class="item-after">';
            if((parseInt(asset._FIELD_INT2) & 1) > 0) {
                ret +=              '<i id="immob-state' + item.IMEI + '" class="icon-other-lock ' + assetFeaturesStatus.immob.state + ' "></i>';
            }
            ret +=                  '<i id="geolock-state'+item.IMEI+'" class="icon-other-geolock '+assetFeaturesStatus.geolock.state+' "></i>';
            ret +=              '</div>';
            ret +=          '</div>';

            ret +=          '<div class="item-text">';
            ret +=              '<div class="row no-gutter">';                            
                                if (assetFeaturesStatus.speed) {
            ret +=                  '<div class="col-50">';
            ret +=                     '<i class="icon-data-speed asset_list_icon"></i>';
            ret +=                     '<span id="speed-value'+item.IMEI+'">'+assetFeaturesStatus.speed.value+'</span>'; 
            ret +=                  '</div>';
                                }
                                if (assetFeaturesStatus.acc) {
            ret +=                  '<div class="col-50">';
            ret +=                     '<i class="icon-other-acc asset_list_icon"></i>';
            ret +=                     '<span id="acc-value'+item.IMEI+'">'+assetFeaturesStatus.acc.value+'</span>'; 
            ret +=                  '</div>';
                                }
                                if (assetFeaturesStatus.voltage) {
            ret +=                  '<div class="col-50">';
            ret +=                     '<i class="icon-data-voltage asset_list_icon"></i>';
            ret +=                     '<span id="voltage-value'+item.IMEI+'">'+assetFeaturesStatus.voltage.value+'</span>';
            ret +=                  '</div>';
                                }  
                                if (assetFeaturesStatus.battery) {
            ret +=                  '<div class="col-50">';
            ret +=                     '<i class="icon-data-battery asset_list_icon"></i>';
            ret +=                     '<span id="battery-value'+item.IMEI+'">'+assetFeaturesStatus.battery.value+'</span>';
            ret +=                  '</div>';
                                }  
                                if (assetFeaturesStatus.temperature) {
            ret +=                  '<div class="col-50">';
            ret +=                     '<i class="icon-data-temperature asset_list_icon"></i>';             
            ret +=                     '<span id="temperature-value'+item.IMEI+'">'+assetFeaturesStatus.temperature.value+'</span>';
            ret +=                  '</div>';
                                }
                                if (assetFeaturesStatus.fuel) {
            ret +=                  '<div class="col-50">';
            ret +=                     '<i class="icon-data-fuel asset_list_icon"></i>';           
            ret +=                     '<span id="fuel-value'+item.IMEI+'">'+assetFeaturesStatus.fuel.value+'</span>'; 
            ret +=                  '</div>';
                                }
                                /*if (assetFeaturesStatus.driver){
            ret +=                  '<div class="col-50">';
            ret +=                      '<i class="icon-data-id asset_list_icon"></i>';
            ret +=                       '<span id="driver-value'+item.IMEI+'">'+assetFeaturesStatus.driver.value+'</span>';
            ret +=                  '</div>';
                                } */
            ret +=              '</div>';
            ret +=          '</div>';
            ret +=      '</div>';                   
            ret +=  '</li>';


            
        }else{
            ret +=  '<li class="item-link item-content item_asset" data-imei="' + item.IMEI + '" data-id="' + item.Id + '" title="No data">';                    
            ret +=      '<div class="item-media">'+ assetImg +'</div>';
            ret +=      '<div class="item-inner">';
            ret +=          '<div class="item-title-row item-title-asse-name">';
            ret +=              '<div class="item-title">' + item.Name + '</div>';
            ret +=              '<div class="item-after"><i class="icon-other-signal state-0"></i><i class="icon-other-satellite state-0"></i></div>';
            ret +=          '</div>';
            ret +=          '<div class="item-title-row item-title-row-status">';
            ret +=              '<div class="item-title item-subtitle state-0"><i class="icon-status-fix icon-other-asset"></i>'+LANGUAGE.COM_MSG11+'</div>';
            ret +=              '<div class="item-after"><i class="icon-other-geolock state-0"></i></div>';
            ret +=          '</div>';
            ret +=      '</div>';                   
            ret +=  '</li>';
        }
            
        return ret;
    },
});

$$('.login-form').on('submit', function (e) {    
	e.preventDefault();	
    preLogin(); 
    return false;
});
/*$$('.btnLogin').on('click', function(){
    login();
});*/
$$('body').on('click', '.notification_button', function(e){
    $$('.notification_button').removeClass('new_not');
});
$$('body').on('click', '.deleteAllNotifications', function(){
    App.confirm(LANGUAGE.PROMPT_MSG016, function () {        
       removeAllNotifications();
    });
});
$$('body').on('change keyup input click', '.only_numbers', function(){
    if (this.value.match(/[^0-9-]/g)) {
         this.value = this.value.replace(/[^0-9-]/g, '');
    }
});

$$('body').on('click', '.sorting_button', function(e) {
    var clickedLink = this;
    var popoverHTML = '<div class="popover">' +
        '<div class="popover-inner">' +
        '<div class="list-block">' +
        '<ul>' +

        '<li><a href="#" class="list-button-label color-gray">' + LANGUAGE.COM_MSG41 + '</a></li>' +
        '<li><a href="#" class="item-link list-button color-dealer" onClick="sortAssetList(this);" data-sort-by="name" >' + LANGUAGE.COM_MSG42 + '</a></li>' +
        '<li><a href="#" class="item-link list-button color-dealer" onClick="sortAssetList(this);" data-sort-by="state" >' + LANGUAGE.COM_MSG43 + '</a></li>' +
        '</ul>' +
        '</div>' +
        '</div>' +
        '</div>';
    App.popover(popoverHTML, clickedLink);
});

$$('body').on('click', '.viewAllButton', function() {
    event.preventDefault();

    loadPageViewAll();

    return false;
});

$$('body').on('click', '.settingsButton', function() {
    event.preventDefault();

    MapControls.showMapControlls(this);

    return false;
});

$$('body').on('click', '.notification_button', function(e){    
    getNewNotifications();     
    var user = localStorage.ACCOUNT;
    var notList = getNotificationList();   

    if (notList && notList[user] && notList[user].length > 0) {
        $$('.notification_button').removeClass('new_not');
        mainView.router.load({
            url:'resources/templates/notification.html',            
        });    
    }else{
        App.addNotification({
            hold: 3000,
            message: LANGUAGE.PROMPT_MSG019                                   
        });
    }
});

$$('#menu li').on('click', function () {
    var id = $$(this).attr('id');
    var activePage = mainView.activePage; 

    switch (id){
        case 'menuHome':
            mainView.router.back({              
              pageName: 'index', 
              force: true
            });         
            break;
            
        case 'menuSettings':            
            if ( typeof(activePage) == 'undefined' || (activePage && activePage.name != "settings")) {  
                //loadProfilePage();
                loadSettingsPage();
            }   
            break; 

        case 'menuGeofence':
            if ( typeof(activePage) == 'undefined' || (activePage && activePage.name != "geofence")) {           
                loadGeofencePage();      
            } 
            break;   

        case 'menuAlarms':
            if ( typeof(activePage) == 'undefined' || (activePage && activePage.name != "alarms.assets")) {           
                loadAlarmsAssetsPage();      
            }
            break;
                
        case 'menuLogout':
            App.confirm(LANGUAGE.PROMPT_MSG012, LANGUAGE.MENU_MSG04, function () {        
                logout();
            });
            break;
        
    }
});

$$('body').on('click', 'a.external', function(event) {
    event.preventDefault();
    var href = this.getAttribute('href');
    if (href && href != '#') {
        /*if (typeof navigator !== "undefined" && navigator.app) {                
            navigator.app.loadUrl(href, {openExternal: true}); 
        } else {
            window.open(href,'_blank');
        }*/
        window.open(encodeURI(href), '_blank', 'location=yes');
    }
    return false;
});

$$('body').on('click', '.toggle-password', function(){
    var password = $(this).siblings("input[name='password']");
    if(password.hasClass('show_pwd')){
        password.prop("type", "password").removeClass('show_pwd');
    }else{
        password.prop("type", "text").addClass('show_pwd');   
    }  
    $(this).toggleClass('color-gray');  
});

$$('body').on('click', '.routeButton', function(event){
    event.preventDefault();
    var that = $$(this);
    var lat = that.data('Lat');
    var lng = that.data('Lng');
    if (lat && lng) {
        var href = API_URL.URL_ROUTE.format(
            encodeURIComponent(lat),
            encodeURIComponent(lng)
            ); 
        
        /*if (typeof navigator !== "undefined" && navigator.app) {                
            navigator.app.loadUrl(href, {openExternal: true}); 
        } else {
            window.open(href,'_blank');
        }*/
        window.open(href, '_blank', 'location=yes');
    }
     return false;
});

$$(document).on('click', 'a.tab-link', function(e){
    e.preventDefault();   
    var currentPage = App.getCurrentView().activePage.name;        
    var page = $$(this).data('id');
    
    if (currentPage != page) {
        switch (page){
            case 'asset.status':
                loadStatusPage();
                break;
            case 'asset.playback':
                loadPlaybackPage();
                break;
            case 'asset.track':
                loadTrackPage();
                break;
            case 'asset.alarm':
                getAlertConfig();
                break;

            /*case 'profile':
                loadProfilePage();
                break;
            case 'resetPwd':
                loadResetPwdPage();
                break;*/
        }
    }
    
    return false;
});

$$(document).on('click', '.backToIndex', function(e){    
    mainView.router.back({
        pageName: 'index', 
        force: true
    });
});

$$('.assets_list').on('click', '.item_asset', function(){
    TargetAsset.ASSET_IMEI = $$(this).data("imei");  
    TargetAsset.ASSET_ID = $$(this).data("id");   
    TargetAsset.ASSET_IMG = '';      
    var assetList = getAssetList();  
    var asset = assetList[TargetAsset.ASSET_IMEI];  

    loadStatusPage();
});

$$(document).on('refresh','.pull-to-refresh-content',function(e){ 
    getNewNotifications({'ptr':true});     
});

$$(document).on('change', '.leaflet-control-layers-selector[type="radio"]', function(){    
    if (TargetAsset.ASSET_IMEI) {
       
        var span = $$(this).next();        
        var switcherWrapper = span.find('.mapSwitcherWrapper');
        if (switcherWrapper && switcherWrapper.hasClass('satelliteSwitcherWrapper')) {
            window.PosMarker[TargetAsset.ASSET_IMEI].setIcon(Protocol.MarkerIcon[1]);
        }else{
            window.PosMarker[TargetAsset.ASSET_IMEI].setIcon(Protocol.MarkerIcon[0]);
        }
    }
});

App.onPageInit('notification', function(page){
    var notificationContainer = $$(page.container).find('.notification_list');
    virtualNotificationList = App.virtualList(notificationContainer, { 
        height: function (item) {
            return 57;
        },
        items: [],
        renderItem: function (index, item) {
            var ret = '';
            if (typeof item == 'object') {
                if (typeof item.speed === "undefined") {
                    item.speed = 0;
                }
                if (typeof item.direct === "undefined") {
                    item.direct = 0;
                }
                if (typeof item.mileage === "undefined") {
                    item.mileage = '-';
                }
                
                ret = '<li class="swipeout" data-id="'+item.listIndex+'" data-title="'+item.title+'" data-type="'+item.type+'" data-imei="'+item.imei+'" data-name="'+item.name+'" data-lat="'+item.lat+'" data-lng="'+item.lng+'" data-time="'+item.time+'" data-speed="'+item.speed+'" data-direct="'+item.direct+'" data-mileage="'+item.mileage+'">' +                        
                            '<div class="swipeout-content item-content">' +
                                '<div class="item-inner">' +
                                    '<div class="item-title-row">' +
                                        '<div class="item-title">'+item.title+'</div>' +
                                        '<div class="item-after">'+item.time+'</div>' +
                                    '</div>' +
                                    '<div class="item-subtitle">'+item.name+'</div>' +                                        
                                '</div>' +
                            '</div>' +                      
                            '<div class="swipeout-actions-left">' +                             
                                '<a href="#" class="swipeout-delete swipeout-overswipe" data-confirm="'+LANGUAGE.PROMPT_MSG010+'" data-confirm-title="'+LANGUAGE.PROMPT_MSG014+'" data-close-on-cancel="true">Delete</a>' +
                            '</div>' +
                            /*'<div class="swipeout-actions-right">' +                             
                                '<a href="#" class="swipeout-delete swipeout-overswipe" data-confirm="'+LANGUAGE.PROMPT_MSG010+'" data-confirm-title="'+LANGUAGE.PROMPT_MSG014+'" data-close-on-cancel="true">Delete</a>' +
                            '</div>' +*/
                        '</li>';
            }
            return  ret;
        }
    });

    var user = localStorage.ACCOUNT;
    var notList = getNotificationList();                

    showNotification(notList[user]);  
    getNewNotifications();      

    notificationContainer.on('deleted', '.swipeout', function () {
        var index = $$(this).data('id');       
        removeNotificationListItem(index);
    });    
    
    notificationContainer.on('click', '.swipeout', function(){
        if ( !$$(this).hasClass('transitioning') ) {  //to preven click when swiping           
            var data = {};
            data.lat = $$(this).data('lat');
            data.lng = $$(this).data('lng');
            data.alarm = $$(this).data('alarm');
            var index = $$(this).data('id');
            var list = getNotificationList();
            var user = localStorage.ACCOUNT; 
            var msg = list[user][index];
            var props = null;
            if (msg) {
                if (msg.payload) {
                    props = isJsonString(msg.payload);
                    if (!props) {
                        props = msg.payload; 
                    }
                }else{
                    props = isJsonString(msg);
                    if (!props) {
                        props = msg; 
                    }
                }
            }            
            if(  props && parseFloat(data.lat) && parseFloat(data.lat)){                
                TargetAsset.ASSET_IMEI = props.Imei ? props.Imei : props.imei;                
                loadTrackPage(props);                              
            }else{
                App.alert(LANGUAGE.PROMPT_MSG023);
            } 

        }            
    });
});

App.onPageInit('forgotPwd', function(page) {
    App.closeModal();
    $$('.backToLogin').on('click', function(){
        App.loginScreen();
    });
    $$('.sendEmail').on('click', function(){
        var email = $$(page.container).find('input[name="Email"]').val();
        
        if (!email) {
            App.alert(LANGUAGE.PASSWORD_FORGOT_MSG01);
        }else{
            var url = API_URL.URL_VERIFY_BY_EMAIL.format(email);             
            App.showPreloader();
            JSON1.request(url, function(result){                 
                    console.log(result);     

                    if (result.MajorCode == '000' && result.MinorCode == '0000') {
                        verifyCheck.email = email;
                        verifyCheck.CheckCode = result.Data.CheckCode;
                        mainView.router.loadPage('resources/templates/forgotPwdCode.html');    
                    }else{
                        App.alert(LANGUAGE.PASSWORD_FORGOT_MSG07);
                    }
                               
                    App.hidePreloader();   
                },
                function(){ App.hidePreloader();   }
            );
        }
     
    });
});
App.onPageInit('forgotPwdCode', function(page) {
    $$('.sendVerifyCode').on('click', function(){
        var VerifyCode = $$(page.container).find('input[name="VerifyCode"]').val();
        
        if (!VerifyCode) {
            App.alert(LANGUAGE.PASSWORD_FORGOT_MSG04);
        }else{
            if (VerifyCode == verifyCheck.CheckCode) {
                mainView.router.load({
                    url:'resources/templates/forgotPwdNew.html',
                    context:{
                        Email: verifyCheck.email
                    }
                });    
            }else{
                App.alert(LANGUAGE.PASSWORD_FORGOT_MSG08);
            }
        }
     
    });
});
App.onPageInit('forgotPwdNew', function(page) {
    $$('.sendPwdNew').on('click', function(){
        var email = $$(page.container).find('input[name="Email"]').val();
        var newPassword = $$(page.container).find('input[name="newPassword"]').val();
        var newPasswordRepeat = $$(page.container).find('input[name="newPasswordRepeat"]').val();
        
        if (!newPassword && newPassword.length < 6) {
            App.alert(LANGUAGE.PASSWORD_FORGOT_MSG05);
        }else{
            if (newPassword != newPasswordRepeat) {
                App.alert(LANGUAGE.PASSWORD_FORGOT_MSG10);
            }else{
                var url = API_URL.URL_FORGOT_PASSWORD.format(email,encodeURIComponent(newPassword),verifyCheck.CheckCode);             
                App.showPreloader();
                JSON1.request(url, function(result){ 
                        if (result.MajorCode == '000' && result.MinorCode == '0000') {
                            App.alert(LANGUAGE.PASSWORD_FORGOT_MSG12);
                            $$('#account').val(email);
                            App.loginScreen();

                            /*mainView.router.back({                             
                              pageName: 'index', 
                              force: true
                            }); */    
                        }else{
                            App.alert(LANGUAGE.PASSWORD_FORGOT_MSG11);
                        }
                                   
                        App.hidePreloader();   
                    },
                    function(){ App.hidePreloader();   }
                );
            }
        }
     
    });
});




App.onPageInit('asset.status', function (page) {  
    $$('.buttonAssetEdit').on('click', function(){

         
        var assetList = getAssetList();  
        var asset = assetList[TargetAsset.ASSET_IMEI]; 
        var AssetImg = 'resources/images/svg_default_asset_photo.svg';
        if (asset && asset.Icon) {
            var pattern = /^IMEI_/i;
            if (pattern.test(asset.Icon)) {
                AssetImg = 'https://upload.quiktrak.co/Attachment/images/'+asset.Icon+'?'+ new Date().getTime();
            }
        }

        var MaxSpeed = asset.MaxSpeed;
        if (MaxSpeed && asset.Unit) {
            MaxSpeed = Protocol.Helper.getSpeedValue(asset.Unit, MaxSpeed);
        }

        console.log(asset);
        mainView.router.load({
        url:'resources/templates/asset.edit.html',
            context:{                
                IMEI: asset.IMEI,
                PRDTName: asset.PRDTName,
                Name: asset.Name,
                Registration: asset.Registration,
                Tag: asset.TagName,
                Unit: asset.Unit,
                Mileage: asset.InitMileage,
                Runtime: asset.InitAcconHours,
                Describe1: asset.Describe1,
                Describe2: asset.Describe2,
                Describe3: asset.Describe3,
                Describe4: asset.Describe4,
                AssetImg: AssetImg,
                MaxSpeed: MaxSpeed,
            }
        });
        
    });

    var geolock = $$(page.container).find('input[name="Geolock"]');
    var immob = $$(page.container).find('input[name="Immobilise"]');
    geolock.on('change', function(){        
        changeGeolockImmobState({id: TargetAsset.ASSET_ID, imei: TargetAsset.ASSET_IMEI, state: this.checked, name: this.attributes.name.value});
    });
    immob.on('change', function(){
        if ((parseInt(POSINFOASSETLIST[TargetAsset.ASSET_IMEI]._FIELD_INT2) & 1) > 0) { // check if asset support immobilise feature
            changeGeolockImmobState({id: TargetAsset.ASSET_ID, imei: TargetAsset.ASSET_IMEI, state: this.checked, name: this.attributes.name.value});
        } else{
            changeSwitcherState({state: !this.checked, name: this.attributes.name.value});       
            showCustomMessage({title: POSINFOASSETLIST[TargetAsset.ASSET_IMEI].Name, text: LANGUAGE.PROMPT_MSG033});
        }         
    });
});
App.onPageInit('asset.edit', function (page) { 
    $$('.upload_photo, .asset_img img').on('click', function (e) {        
        App.actions(cameraButtons);        
    }); 
    var selectUnitSpeed = $$('select[name="Unit"]');   
    selectUnitSpeed.val(selectUnitSpeed.data("set"));

    $$('.saveAssetEdit').on('click', function(){
        var device = {
            IMEI: $$(page.container).find('input[name="IMEI"]').val(),
            Name: $$(page.container).find('input[name="Name"]').val(),
            Registration: $$(page.container).find('input[name="Registration"]').val(),
            Tag: $$(page.container).find('input[name="Tag"]').val(),
            Unit: $$(page.container).find('select[name="Unit"]').val(),
            Mileage: $$(page.container).find('input[name="Mileage"]').val(),
            Runtime: $$(page.container).find('input[name="Runtime"]').val(),            
            Describe1: $$(page.container).find('input[name="Describe1"]').val(),
            Describe2: $$(page.container).find('input[name="Describe2"]').val(),
            Describe3: $$(page.container).find('input[name="Describe3"]').val(),
            Describe4: $$(page.container).find('input[name="Describe4"]').val(),
            Icon: TargetAsset.ASSET_IMG,
            MaxSpeed: MaxSpeed,
        };
        console.log(device);
        var userInfo = getUserinfo();         
        var url = API_URL.URL_EDIT_DEVICE.format(userInfo.MinorToken,
                TargetAsset.ASSET_ID,
                encodeURIComponent(device.Name),
                encodeURIComponent(device.Unit),
                encodeURIComponent(device.Mileage),
                encodeURIComponent(device.Runtime),
                encodeURIComponent(device.Describe1),
                encodeURIComponent(device.Describe2),
                encodeURIComponent(device.Describe3),
                encodeURIComponent(device.Describe4),
                encodeURIComponent(device.Tag),
                device.Icon,
                userInfo.MajorToken,
                encodeURIComponent(device.Registration),
                encodeURIComponent(device.MaxSpeed)
            );
    

        App.showPreloader();
        JSON1.request(url, function(result){ 
                console.log(result);                  
                if (result.MajorCode == '000') {
                    TargetAsset.ASSET_IMG = '';
                    updateAssetList(device);
                    init_AssetList();                    
                }else{
                    App.alert('Something wrong');
                }
                App.hidePreloader();
            },
            function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); }
        );                 
    });

});

App.onPageInit('asset.edit.photo', function (page) { 
    //page.context.imgSrc = 'resources/images/add_photo_general.png';

    initCropper();
    //alert(cropper);
    
    //After the selection or shooting is complete, jump out of the crop page and pass the image path to this page
    //image.src = plus.webview.currentWebview().imgSrc;
    //image.src = "img/head-default.jpg";    

    $$('#save').on('click', function(){
        saveImg();
    });
    $$('#redo').on('click', function(){
        cropper.rotate(90);
    });
    $$('#undo').on('click', function(){
        cropper.rotate(-90);
    });
});

App.onPageInit('settings', function (page) {
    var buttunProfilePage = $$(page.container).find('.openProfilePage');
    var buttunPasswordPage = $$(page.container).find('.openPasswordPage');
    var buttunDeleteHistoryPage = $$(page.container).find('.openDeleteHistoryPage');

    buttunProfilePage.on('click', function(){
        loadProfilePage();
    });
    buttunPasswordPage.on('click', function(){
        loadResetPwdPage();
    });
    buttunDeleteHistoryPage.on('click', function(){
        loadDeleteHistoryPage();  
    });

});

App.onPageInit('profile', function (page) {     
    $$('.saveProfile').on('click', function(e){
        var user = {
            FirstName: $$(page.container).find('input[name="FirstName"]').val(),
            SubName: $$(page.container).find('input[name="SubName"]').val(),
            Mobile: $$(page.container).find('input[name="Mobile"]').val(),
            Phone: $$(page.container).find('input[name="Phone"]').val(),
            EMail: $$(page.container).find('input[name="EMail"]').val(),
        };
        var userInfo = getUserinfo(); 
        var url = API_URL.URL_EDIT_ACCOUNT.format(userInfo.MajorToken,
                userInfo.MinorToken,
                user.FirstName,
                user.SubName,
                user.Mobile,
                user.Phone,
                user.EMail
            ); 
        App.showPreloader();
        JSON1.request(url, function(result){ 
                console.log(result);                  
                if (result.MajorCode == '000') {                    
                    userInfo.User = {
                        FirstName: result.Data.User.FirstName,
                        SubName: result.Data.User.SubName,
                        Mobile: result.Data.User.Mobile,
                        Phone: result.Data.User.Phone,
                        EMail: result.Data.User.EMail,
                    };
                   
                    setUserinfo(userInfo);
                    
                    mainView.router.back();
                }else{
                    App.alert('Something wrong');
                }
                App.hidePreloader();
            },
            function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); }
        ); 
    });
});

App.onPageInit('alarms.assets', function (page) {

    var assetListContainer = $$(page.container).find('.alarmsAssetList');
    var searchForm = $$('.searchbarAlarmsAssets');
    var assetList = getAssetList();   
    var newAssetlist = [];
    var keys = Object.keys(assetList);

    $.each(keys, function( index, value ) {  
        assetList[value].Selected = false;        
        newAssetlist.push(assetList[value]);       
    });
    
    newAssetlist.sort(function(a,b){
        if(a.Name < b.Name) return -1;
        if(a.Name > b.Name) return 1;
        return 0;
    }); 
    
    var virtualAlarmsAssetsList = App.virtualList(assetListContainer, { 
        items: newAssetlist,
        height: function (item) {
            return 44;
        },
        searchAll: function (query, items) {
            console.log(items);
            var foundItems = [];        
            for (var i = 0; i < items.length; i++) {           
                // Check if title contains query string
                if (items[i].Name.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0) foundItems.push(i);
            }
            // Return array with indexes of matched items
            return foundItems; 
        },         
        renderItem: function (index, item) {
            var ret = '';            

            ret +=  '<li data-index="'+index+'">';
            ret +=      '<label class="label-checkbox item-content">';
                 if (item.Selected) {
                    ret +=          '<input type="checkbox" name="alarms-assets" value="" data-id="' + item.Id + '" data-imei="' + item.IMEI + '" checked="true" >';
                }else{
                    ret +=          '<input type="checkbox" name="alarms-assets" value="" data-id="' + item.Id + '" data-imei="' + item.IMEI + '" >';
                } 
            ret +=          '<div class="item-media"><i class="icon icon-form-checkbox"></i></div>';
            ret +=          '<div class="item-inner">';
            ret +=              '<div class="item-title ">' + item.Name + '</div>';
            ret +=          '</div>';
            ret +=      '</label>';
            ret +=  '</li>';
            
            return  ret;
        }
    });  
    
    var searchbarAlarmsAssets = App.searchbar(searchForm, {
        searchList: '.alarmsAssetList',
        searchIn: '.alarmsAssetList .item-title',
        found: '.list-block-search-alarms-assets',
        notFound: '.alarms-assets-search-nothing-found',
        onDisable: function(s){
            //$(s.container).slideUp();
        }
    });

    
    var SelectAll = $$(page.container).find('input[name="select-all"]');

    SelectAll.on('change', function(){          
        var state = false;
        if( $$(this).prop('checked') ){
            state = true;
        }
        $.each(virtualAlarmsAssetsList.items, function(index, value){
            value.Selected = state;
        });        
        virtualAlarmsAssetsList.replaceAllItems(virtualAlarmsAssetsList.items);        
    });
    

    assetListContainer.on('change', 'input[name="alarms-assets"]', function(){
        var index = $$(this).closest('li').data('index');        
        if (this.checked) {         
            virtualAlarmsAssetsList.items[index].Selected = true;
        }else{
            virtualAlarmsAssetsList.items[index].Selected = false;          
        }          
    });
    
    $('.saveAssets').on('click', function(){ 
        var assets = []; 
        $.each(virtualAlarmsAssetsList.items, function(index, value){               
            if (value.Selected) {
                assets.push(value.IMEI);
            }               
        });        
        
        if (assets.length > 0) {
            mainView.router.load({
                url:'resources/templates/alarms.select.html',
                context:{
                    Assets: assets.toString()
                }
            }); 
        }else{
            App.addNotification({
                hold: 3000,
                message: LANGUAGE.PROMPT_MSG024                                   
            });
        }
    });
       

});

/*App.onPageInit('alarms.select', function (page) {

    var alarm = $$(page.container).find('input[name = "checkbox-alarm"]');    

    var alarmFields = ['accOff','accOn','customAlarm','custom2LowAlarm','geolock','geofenceIn','geofenceOut','illegalIgnition','lowBattery','mainBatteryFail','sosAlarm','speeding','tilt', 'harshAcc', 'harshBrk'];  
   
    var allCheckboxesLabel = $$(page.container).find('label.item-content');
    var allCheckboxes = allCheckboxesLabel.find('input');
    var assets = $$(page.container).find('input[name="Assets"]').val();
    

    alarm.on('change', function(e) { 
        if( $$(this).prop('checked') ){
            allCheckboxes.prop('checked', true);
        }else{
            allCheckboxes.prop('checked', false);
        }
    });

    allCheckboxes.on('change', function(e) { 
        if( $$(this).prop('checked') ){
            alarm.prop('checked', true);
        }
    });    
    
    $$('.saveAlarm').on('click', function(e){        
        var alarmOptions = {
            IMEI: assets,
            options: 0,            
        };
        if (alarm.is(":checked")) {
            alarmOptions.alarm = true;
        }

        $.each(alarmFields, function( index, value ) {
            var field = $$(page.container).find('input[name = "checkbox-'+value+'"]');
            if (!field.is(":checked")) {
                alarmOptions[value] = false;
                alarmOptions.options = alarmOptions.options + parseInt(field.val(), 10);
            }else{
                alarmOptions[value] = true;
            }
        });

        console.log(alarmOptions.options);  
        
        var userInfo = getUserinfo(); 
        var url = API_URL.URL_SET_ALARM.format(userInfo.MinorToken,
                alarmOptions.IMEI,
                alarmOptions.options                                
            );                    
        
        App.showPreloader();
        JSON1.request(url, function(result){ 
                console.log(result);                  
                if (result.MajorCode == '000') {                    
                    //setAlarmList(alarmOptions);
                    updateAlarmOptVal(alarmOptions);
                    mainView.router.back({
                        pageName: 'index', 
                        force: true
                    });
                }else{
                    App.alert('Something wrong');
                }
                App.hidePreloader();
            },
            function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG16); }
        ); 
        
    });

});*/

App.onPageInit('alarms.select', function(page) {

    var alarm = $$(page.container).find('input[name = "checkbox-alarm"]');


    var allCheckboxes = $$(page.container).find('input.input-checkbox-alarm');
    var assets = $$(page.container).find('input[name="Assets"]').val();

    var alarmPreferenceList = $$(page.container).find('.alarm_list');
    var ignoreBetweenEl = $$(page.container).find('[name="ignoreBetween"]');
    var pickerWrapperEl = $$(page.container).find('.picker-el-wrapper');
    var ignoreOnEl = $$(page.container).find('.ignore-on-wrapper');
    var BeginTimeInput = $$(page.container).find('[name="picker-from"]');
    var EndTimeInput = $$(page.container).find('[name="picker-to"]');
    var BeginTimeValArray = BeginTimeInput.val() ? BeginTimeInput.val().split(':') : [];
    var EndTimeInputArray = EndTimeInput.val() ? EndTimeInput.val().split(':') : [];


    var speedingInputEl = $$(page.container).find('input[name="checkbox-speeding"]');
    var overspeedRadioWrapperEl = $$(page.container).find('.overspeed-radio-wrapper');
    var overspeedRadioEl = $$(page.container).find('input[name="overspeed-radio"]');
    var overspeedVal = page.context.MaxSpeed ? page.context.MaxSpeed : 80;

    var offlineInputEl = $$(page.container).find('input[name="checkbox-offline"]');
    var offlineOptionsWrapperEl = $$(page.container).find('.offline-options-wrapper');
    var offlineOptionsEl = $$(page.container).find('input[name="offline-option"]');
    var showHintEl = $$(page.container).find('.showHint');

    showHintEl.on('click', function(){
        var parent = this.closest('.hintParent');
        var title = parent.getAttribute('data-hint-title');
        var text = parent.getAttribute('data-hint-text');

        var popoverHTML = `<div class="popover popover-status">
            ${ title ? `<p class="color-dealer">${ title }</p>` : '' }
            ${ text ? `<p >${ text }</p>` : '' }
            </div>`;
        App.popover(popoverHTML, this);
    });


    speedingInputEl.on('change', function() {
        if (this.checked) {
            overspeedRadioWrapperEl.removeClass('disabled');
        }  else{
            overspeedRadioWrapperEl.addClass('disabled');
        }
    });

    alarm.on('change', function(e) {
        for (var i = allCheckboxes.length - 1; i >= 0; i--) {
            allCheckboxes[i].checked = this.checked;
            if (allCheckboxes[i].name == 'checkbox-speeding' || allCheckboxes[i].name == 'checkbox-offline') {
                allCheckboxes[i].dispatchEvent(new Event('change'));
            }
        }
    });

    ignoreBetweenEl.on('change', function() {
        pickerWrapperEl.toggleClass('disabled');
        ignoreOnEl.toggleClass('disabled');
    });

    overspeedRadioEl.on('change', function(e) {
        if (e.target.value == 2) {
            App.modal({
                title: '<div class="custom-modal-logo-wrapper"><img class="custom-modal-logo" src="resources/images/logo.png" alt=""/></div>',
                text: '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG060 + ':</div>',
                afterText: `
                <div class="list-block list-block-modal m-0 no-hairlines ">          
                    <ul>                               
                        <li>
                            <div class="item-content pl-0">                                    
                                <div class="item-inner pr-0">                                      
                                    <div class="item-input item-input-field">
                                        <input type="tel" placeholder="${ LANGUAGE.PROMPT_MSG060 }" name="Overspeed" value="${ overspeedVal}" class="only_numbers">
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                `,
                buttons: [{
                    text: LANGUAGE.COM_MSG04,
                    onClick: function() {
                        for (var i = overspeedRadioEl.length - 1; i >= 0; i--) {
                            if (overspeedRadioEl[i].value == '1') {
                                overspeedRadioEl[i].checked = true;
                                break;
                            }
                        }
                    }
                },
                    {
                        text: LANGUAGE.COM_MSG38,
                        bold: true,
                        onClick: function(modal, e) {
                            //console.log(modal, e);
                            var enteredVal = $$(modal).find('input[name="Overspeed"]').val();
                            overspeedVal = enteredVal ? enteredVal : 1;
                        }
                    },
                ]
            });
        }
    });

    offlineInputEl.on('change', function(e) {
        for (var i = offlineOptionsEl.length - 1; i >= 0; i--) {
            offlineOptionsEl[i].checked = this.checked;
        }
        if (this.checked) {
            offlineOptionsWrapperEl.removeClass('disabled');
        } else{
            offlineOptionsWrapperEl.addClass('disabled');
        }
    });

    offlineOptionsEl.on('change', function(e) {
        let found = false;
        for (var i = offlineOptionsEl.length - 1; i >= 0; i--) {
            if (offlineOptionsEl[i].checked == true) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.checked = true;
            App.addNotification({
                hold: 3000,
                message: LANGUAGE.PROMPT_MSG061
            });
        }
    });

    if (!BeginTimeValArray || !BeginTimeValArray.length) {
        BeginTimeValArray = ['07', '00'];
    }
    if (!EndTimeInputArray || !EndTimeInputArray.length) {
        EndTimeInputArray = ['18', '00'];
    }
    var pickerFrom = App.picker({
        input: BeginTimeInput,
        cssClass: 'custom-picker custom-time',
        toolbarTemplate: '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left"><div class="text">' + LANGUAGE.GEOFENCE_MSG_29 + '</div></div>' +
            '<div class="right">' +
            '<a href="#" class="link close-picker color-black">{{closeText}}</a>' +
            '</div>' +
            '</div>' +
            '</div>',

        value: BeginTimeValArray,

        onChange: function(picker, values, displayValues) {

        },

        formatValue: function(p, values, displayValues) {
            return values[0] + ':' + values[1];
        },

        cols: [
            // Hours
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            },

            // Minutes
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    var pickerTo = App.picker({
        input: EndTimeInput,
        cssClass: 'custom-picker custom-time',
        toolbarTemplate: '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left"><div class="text">' + LANGUAGE.GEOFENCE_MSG_30 + '</div></div>' +
            '<div class="right">' +
            '<a href="#" class="link close-picker color-black">{{closeText}}</a>' +
            '</div>' +
            '</div>' +
            '</div>',

        value: EndTimeInputArray,

        onChange: function(picker, values, displayValues) {

        },

        formatValue: function(p, values, displayValues) {
            return values[0] + ':' + values[1];
        },

        cols: [
            // Hours
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            },

            // Minutes
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    $$(alarmPreferenceList).on('click', 'li.picker-el-wrapper', function(event) {
        event.stopPropagation();
        var input = $$(this).find('input');

        if (input) {
            var name = input.attr('name');
            switch (name) {
                case 'picker-from':
                    pickerFrom.open();
                    break;
                case 'picker-to':
                    pickerTo.open();
                    break;
            }
        }
    });


    $$('.saveAlarm').on('click', function(e) {
        var userInfo = getUserinfo();
        var ignoreDaysArr = $(page.container).find('[name="ignore-days"]').val();

        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            IMEIS: assets,
            DateFrom: moment(BeginTimeInput.val(), 'HH:mm').utc().format('HH:mm'),
            DateTo: moment(EndTimeInput.val(), 'HH:mm').utc().format('HH:mm'),
            AlertTypes: 0,
            Weeks: '',
            IsIgnore: 0,
        };

        if (ignoreBetweenEl.is(":checked")) {
            data.IsIgnore = 1;
        }
        if (ignoreDaysArr && ignoreDaysArr.length) {
            data.Weeks = ignoreDaysArr.toString();
        }
        if (allCheckboxes && allCheckboxes.length) {
            for (var i = allCheckboxes.length - 1; i >= 0; i--) {
                /*if (allCheckboxes[i].checked) {*/
                if (!allCheckboxes[i].checked) {
                    data.AlertTypes += parseInt(allCheckboxes[i].value, 10);
                }
            }
        }

        if (speedingInputEl.is(":checked")) {
            data.SpeedingMode = parseInt($$(page.container).find('input[name="overspeed-radio"]:checked').val(),10);
            if (data.SpeedingMode == 2) {
                data.MaxSpeed = overspeedVal;
            }
        }

        if (offlineInputEl.is(":checked")) {
            data.OfflineHours = '';
            for (var i = offlineOptionsEl.length - 1; i >= 0; i--) {
                if (offlineOptionsEl[i].checked) {
                    data.OfflineHours += offlineOptionsEl[i].value + ',';
                }
            }
            if (data.OfflineHours) {
                data.OfflineHours = data.OfflineHours.slice(0, -1);
            }
        }

        /*console.log(data);*/

        App.showPreloader();
        $.ajax({
            type: "POST",
            url: API_URL.URL_SET_ALERT_CONFIG,
            data: data,
            async: true,
            cache: false,
            crossDomain: true,
            success: function(result) {
                App.hidePreloader();
                console.log(result);
                if (result.MajorCode == '000') {
                    mainView.router.back({
                        pageName: 'index',
                        force: true
                    });

                    if (speedingInputEl.is(":checked")) {
                        var arr = [];
                        var assets = data.IMEIS.split(',');
                        for (var i = assets.length - 1; i >= 0; i--) {
                            var obj = {
                                IMEI: assets[i],
                                Props: {
                                    MaxSpeedAlertMode: data.SpeedingMode
                                }
                            };
                            if (data.SpeedingMode == 2) {
                                obj.Props.MaxSpeed = data.MaxSpeed;
                            }
                            arr.push(obj);
                        }
                        updateAssetList3(arr);
                    }

                } else {
                    App.alert(LANGUAGE.PROMPT_MSG013);
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }
        });

    });

});

App.onPageBeforeRemove('alarms.select', function(page) {
    // fix to close modal calendar if it was opened and default back button pressed
    App.closeModal('.custom-picker');
});

App.onPageInit('geofence', function(page) {
    var geofenceListContainer = $$(page.container).find('.geofenceList');
    var geofenceSearchForm = $$(page.container).find('.searchbarGeofence');
    var geofenceList = getGeoFenceList();
    var arrGeofenceList = [];
    var geofenceListKeys = Object.keys(geofenceList);
    var userInfo = getUserinfo();


    $.each(geofenceListKeys, function(index, value) {
        geofenceList[value].Name = geofenceList[value].Name.toLowerCase();
        arrGeofenceList.push(geofenceList[value]);
    });

    arrGeofenceList.sort(function(a, b) {
        if (a.Name < b.Name) return -1;
        if (a.Name > b.Name) return 1;
        return 0;
    });
    // console.log(arrGeofenceList);
    if (virtualGeofenceList) {
        virtualGeofenceList.destroy();
    }
    virtualGeofenceList = App.virtualList(geofenceListContainer, {
        searchAll: function(query, items) {
            var foundItems = [];
            for (var i = 0; i < items.length; i++) {
                // Check if title contains query string
                if (items[i].Name.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0) foundItems.push(i);
            }
            // Return array with indexes of matched items
            return foundItems;
        },
        items: arrGeofenceList,
        renderItem: function(index, item) {
            var ret = '';
            if (item.CustomerCode !== userInfo.MajorToken){ // if geofence is shared from master account
                ret = '<li class="item-content" id="' + item.Code + '" data-code="' + item.Code + '" data-index="' + index + '" data-state="' + item.State + '" data-customer-code="'+item.CustomerCode+'">' +
                    '<div class="item-inner">' +
                    //'<div class="item-title-row">' +
                    '<div class="item-title ">' + item.Name + '</div>' +

                    //'</div>' +
                    '<div class="item-text">' + item.Address + '</div>' +
                    '</div>' +
                    '</li>';
            }else{
                ret = '<li class="item-content" id="' + item.Code + '" data-code="' + item.Code + '" data-index="' + index + '" data-state="' + item.State + '" data-customer-code="'+item.CustomerCode+'">' +
                    '<div class="item-inner">' +
                    '<div class="item-title-row">' +
                    '<div class="item-title ">' + item.Name + '</div>' +
                    '<div class="item-after "><a href="#" class="item-link geofence_menu"><i class="f7-icons icon-other-menu-geofence color-dealer"></i></a></div>' +
                    '</div>' +
                    '<div class="item-text">' + item.Address + '</div>' +
                    '</div>' +
                    '</li>';
            }


            return ret;
        }
    });

    initSearchbar(geofenceSearchForm);


    /*$$('.button_search').on('click', function(){
        $('.searchbarGeofence').slideDown(400, function(){
            $$('.searchbarGeofence input').focus();
        });
    });*/
    $$('.addGeofence').on('click', function(e) {
        var assetList = formatArrAssetList();

        mainView.router.load({
            url: 'resources/templates/geofence.add.html',
            context: {
                GeofenceName: LANGUAGE.GEOFENCE_MSG_00,
                Assets: assetList,
            }
        });
    });

    geofenceListContainer.on('click', '.item-title, .item-text', function() {
        var geofenceCode = $$(this).closest('li').data('code');
        var customerCode = $$(this).closest('li').data('customer-code');
        if  (customerCode !== userInfo.MajorToken){
            loadGeofenceViewPage(geofenceCode);

        }else{
            editGeofence(geofenceCode);
        }

    });

    geofenceListContainer.on('click', '.geofence_menu', function() {
        var parentLi = $$(this).closest('li');
        var geofenceCode = parentLi.data('code');
        var listIndex = parentLi.data('index');
        //virtualGeofenceList.deleteItem(listIndex);

        var state = '';
        if (parentLi.data('state') == 1) {
            state = 'checked="checked"';
        }

        var editGeo = '<div class="action_button_wrapper">' +
            '<div class="action_button_block action_button_media">' +
            '<i class="f7-icons icon-other-edit"></i>' +
            '</div>' +
            '<div class="action_button_block action_button_text">' +
            LANGUAGE.COM_MSG17 +
            '</div>' +
            '</div>';
        var deleteGeo = '<div class="action_button_wrapper">' +
            '<div class="action_button_block action_button_media">' +
            '<i class="f7-icons icon-other-remove"></i>' +
            '</div>' +
            '<div class="action_button_block action_button_text">' +
            LANGUAGE.COM_MSG18 +
            '</div>' +
            '</div>';


        var toggleGeo = '<div class="action_button_wrapper">' +
            '<div class="action_button_block action_button_media">' +
            '<i class="f7-icons icon-other-active"></i>' +
            '</div>' +
            '<div class="action_button_block action_button_text">' +
            LANGUAGE.GEOFENCE_MSG_10 +
            '</div>' +
            '<span class="label-switch actionButton-label">' +
            '<input type="checkbox" name="checkbox-active" ' + state + '>' +
            '<div class="checkbox"></div>' +
            '</span>' +
            '</div>';

        var buttons = [{
            text: LANGUAGE.COM_MSG17, //editGeo,
            onClick: function() {
                editGeofence(geofenceCode);
            }
        },
            /*{
                text: toggleGeo,
                onClick: function() {
                    //editGeofence(geofenceCode);
                    var stateNew = 1;
                    if (parentLi.data('state') == 1) {
                        stateNew = 0;
                    }
                    changeGeofenceState(arrGeofenceList[parentLi.data('index')], stateNew);

                }
            },*/
            {
                text: LANGUAGE.COM_MSG18, //deleteGeo,
                color: 'red',
                onClick: function() {
                    App.confirm(LANGUAGE.PROMPT_MSG011, function() {
                        deleteGeofence(geofenceCode, listIndex);
                    });
                }
            },

        ];
        App.actions(buttons);
    });


});

App.onPageInit('geofence.view', function(page) {
    showMapGeofence(getGeoFenceList()[page.context.Code]);
});
App.onPageBeforeRemove('geofence.view', function(page) {
    MapTrack.off('draw:created', onMapGeofenceDraw);
});

App.onPageInit('geofence.add', function(page) {
    var valEdit = $$(page.container).find('input[name="geofenceEdit"]').val();

    var timeRangeState = $$(page.container).find('select[name="timeRangeState"]');
    //var timeRangeblocks = $$(page.container).find('.time_range_block');
    var searchGeofenceAddress = $$(page.container).find('form[name="searchGeofenceAddress"]');
    var container = $$(page.container).find('.page-content');
    //var radius = $$(page.container).find('input[name="geolockRadius"]');
    var address = $$(page.container).find('[name="geofenceAddress"]');
    var geofenceName = $$(page.container).find('input[name="geofenceName"]');
    var assets = $$(page.container).find('select[name="assets"]');

    var geofencePreferenceList = $$(page.container).find('.list_geofence_preferences');
    var ignoreBetweenEl = $$(page.container).find('[name="ignoreBetween"]');
    var pickerWrapperEl = $$(page.container).find('.picker-el-wrapper');
    var ignoreOnEl = $$(page.container).find('.ignore-on-wrapper');
    var BeginTimeInput = $$(page.container).find('[name="picker-from"]');
    var EndTimeInput = $$(page.container).find('[name="picker-to"]');
    var BeginTimeValArray = BeginTimeInput.val() ? BeginTimeInput.val().split(':') : [];
    var EndTimeInputArray = EndTimeInput.val() ? EndTimeInput.val().split(':') : [];

    if (!BeginTimeValArray || !BeginTimeValArray.length) {
        BeginTimeValArray = ['19', '00'];
    }
    if (!EndTimeInputArray || !EndTimeInputArray.length) {
        EndTimeInputArray = ['06', '00'];
    }

    var showHintEl = $$(page.container).find('.showHint');

    showHintEl.on('click', function(){
        var parent = this.closest('.hintParent');
        var title = parent.getAttribute('data-hint-title');
        var text = parent.getAttribute('data-hint-text');

        var popoverHTML = `<div class="popover popover-status">
            ${ title ? `<p class="color-dealer">${ title }</p>` : '' }
            ${ text ? `<p >${ text }</p>` : '' }
            </div>`;
        App.popover(popoverHTML, this);
    });

    //var today = new Date();

    /*radius.on('change input', function() {
        var value = this.value;
        if (!value.match(/[^0-9]/g)) {
            window.PosMarker.geofence.setRadius(value);
            if (geofenceMarkerGroup && geofenceMarkerGroup.getLayers().length > 0) {
                MapTrack.flyToBounds([geofenceMarkerGroup.getBounds(), window.PosMarker.geofence.getBounds()], { padding: [8, 8] });
            } else {
                MapTrack.flyToBounds([window.PosMarker.geofence.getBounds()], { padding: [8, 8] });
            }
        }
    });*/

    /*timeRangeState.on('change', function() {
        var value = this.value;
        App.showTab('#tab' + value);
    });*/

    assets.on('change', function() {
        var arrAssets = [];
        assets.find('option:checked').each(function() {
            arrAssets.push($$(this).data('imei'));
        });
        updateGeofenceMarkerGroup(arrAssets, valEdit ? 1 : 0);
    });

    searchGeofenceAddress.on('submit', function(e) {
        e.preventDefault();
        var valAddress = address.val();
        if (valAddress.length >= 3) {
            Protocol.Helper.getLatLngByGeocoder(valAddress, function(latlng) {
                if (latlng) {
                    container.scrollTop(0, 300, function() {
                        //window.PosMarker.geofence.setLatLng(latlng);
                        MapTrack.setView(latlng);
                    });
                } else {
                    App.addNotification({
                        hold: 3000,
                        message: LANGUAGE.COM_MSG05
                    });
                }
            });
        }
        return false;
    });

    var pickerFrom = App.picker({
        input: BeginTimeInput,
        cssClass: 'custom-picker custom-time',
        toolbarTemplate: '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left"><div class="text">' + LANGUAGE.GEOFENCE_MSG_29 + '</div></div>' +
            '<div class="right">' +
            '<a href="#" class="link close-picker color-black">{{closeText}}</a>' +
            '</div>' +
            '</div>' +
            '</div>',

        value: BeginTimeValArray,

        onChange: function(picker, values, displayValues) {
            /*var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
            if (values[1] > daysInMonth) {
                picker.cols[1].setValue(daysInMonth);
            }*/
        },

        formatValue: function(p, values, displayValues) {
            return values[0] + ':' + values[1];
        },

        cols: [
            // Hours
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            },
            // Divider
            /*{
                divider: true,
                content: ':'
            },*/
            // Minutes
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    var pickerTo = App.picker({
        input: EndTimeInput,
        cssClass: 'custom-picker custom-time',
        toolbarTemplate: '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left"><div class="text">' + LANGUAGE.GEOFENCE_MSG_30 + '</div></div>' +
            '<div class="right">' +
            '<a href="#" class="link close-picker color-black">{{closeText}}</a>' +
            '</div>' +
            '</div>' +
            '</div>',

        value: EndTimeInputArray,

        onChange: function(picker, values, displayValues) {
            /*var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
            if (values[1] > daysInMonth) {
                picker.cols[1].setValue(daysInMonth);
            }*/
        },

        formatValue: function(p, values, displayValues) {
            return values[0] + ':' + values[1];
        },

        cols: [
            // Hours
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            },
            // Divider
            /*{
                divider: true,
                content: ':'
            },*/
            // Minutes
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    $$(geofencePreferenceList).on('click', 'li.picker-el-wrapper', function(event) {
        event.stopPropagation();
        var input = $$(this).find('input');

        if (input) {
            var name = input.attr('name');
            switch (name) {
                case 'picker-from':
                    pickerFrom.open();
                    break;
                case 'picker-to':
                    pickerTo.open();
                    break;
            }
        }
    });

    ignoreBetweenEl.on('change', function() {
        pickerWrapperEl.toggleClass('disabled');
        ignoreOnEl.toggleClass('disabled');
        /*if (this.checked) {
            pickerWrapperEl.removeClass('disabled');
            ignoreOnEl.removeClass('disabled');
        }else{
            pickerWrapperEl.addClass('disabled');
            ignoreOnEl.addClass('disabled');
        }*/
    });

    if (valEdit) {

        showMapGeofence(getGeoFenceList()[valEdit]);

    } else {
        showMapGeofence();
    }

    $$('.saveGeofence').on('click', function() {
        var white_spaces = /([^\s])/;
        var valid = 1;
        var errorList = [];
        //var valRadius = radius.val();
        var valGeofenceName = geofenceName.val();
        var alarmType = $$(page.container).find('select[name="alarmType"]');
        var valAlarmType = '';

        var ignoreState = $$(page.container).find('input[name="ignoreBetween"]');
        var ignoreDays = $(page.container).find('select[name="ignore-days"]');
        var ignoreTimeFrom = $$(page.container).find('input[name="picker-from"]');
        var ignoreTimeTo = $$(page.container).find('input[name="picker-to"]');
        var ignoreDaysArr = ignoreDays.val();

        var geofenceLayers =  GeofenceFiguresGroup.getLayers();
        var geofenceLayer = geofenceLayers.length ? geofenceLayers[0] : false;
        //GeofenceFiguresGroup
        /*if (valRadius < 100) {
            valid = 0;
            errorList.push(LANGUAGE.PROMPT_MSG008);
        }*/
        if (!geofenceLayer){
            valid = 0;
            errorList.push(LANGUAGE.PROMPT_MSG072);
        }

        if (!white_spaces.test(valGeofenceName)) {
            valid = 0;
            errorList.push(LANGUAGE.PROMPT_MSG025);
        }

        alarmType.find('option:checked').each(function() {
            valAlarmType += ',' + $$(this).val();
        });
        if (!valAlarmType) {
            valid = 0;
            errorList.push(LANGUAGE.PROMPT_MSG026);
        } else {
            valAlarmType = valAlarmType.substr(1);
        }

        if (ignoreState.is(":checked")) {
            if (!ignoreDaysArr) {
                valid = 0;
                errorList.push(LANGUAGE.PROMPT_MSG059);
            }
        }

        if (valid) {
            var userInfo = getUserinfo();

            var valAssets = '';
            assets.find('option:checked').each(function() {
                valAssets += ',' + $$(this).val();
            });
            if (valAssets) {
                valAssets = valAssets.substr(1);
            }

            var valAddress = address.val();
            //var latlng = window.PosMarker.geofence.getLatLng();
            var state = $$(page.container).find('input[name="geofenceState"]');
            var valState = 0;
            if (state.is(":checked")) {
                valState = 1;
            }
            var shareEl = $$(page.container).find('input[name="geofence-share"]');




            var data = {
                MajorToken: userInfo.MajorToken,
                MinorToken: userInfo.MinorToken,
                Name: valGeofenceName,
                //Lat: latlng.lat,
                //Lng: latlng.lng,
                Radius: 0,
                Alerts: valAlarmType,
                DelayTime: 0,
                AlertConfigState: valState,
                GeoType: 1, //circle
                AssetCodes: valAssets,
                Address: valAddress,
                Share: shareEl.is(":checked") ? 1 : 0,
                Inverse: 0,
                CycleType: 3, // NONE = 0, TIME = 1, DATE = 2, WEEK = 3
            };

            if (geofenceLayer.options.radius) { //circle
                var latlng = geofenceLayer.getLatLng();

                data.Lat = latlng.lat;
                data.Lng = latlng.lng;
                data.Radius = parseInt(geofenceLayer.getRadius(),10);
            }else{ // else Polygon
                var latlngs = geofenceLayer.getLatLngs();
                if (latlngs.length === 1 && $.isArray(latlngs[0]) && latlngs[0].length > 1) {
                    latlngs=latlngs[0];
                    if (latlngs[0].lat !== latlngs[latlngs.length-1].lat || latlngs[0].lng !== latlngs[latlngs.length-1].lng){
                        latlngs.push(latlngs[0]);
                    }
                }

                if (!isClockwise(latlngs)){
                    latlngs = latlngs.reverse();
                }

                data.GeoType = 2;

                var latlngArry=[];

                for(var i=0;i<latlngs.length;i++){
                    latlngArry.push(latlngs[i].lng+" "+latlngs[i].lat);
                }
                //latlngArry.push(latlngs[0].lng+" "+latlngs[0].lat);
                data.GeoPolygon = "POLYGON(("+latlngArry.join(',')+"))";

                data.Lat = latlngs[0].lat;
                data.Lng = latlngs[0].lng;
            }

            if (ignoreState.is(":checked")) {
                data.Inverse = 1;
            }
            if (ignoreDaysArr && ignoreDaysArr.length) {
                data.Days = ignoreDaysArr.toString();
            }
            data.BeginTime = moment(ignoreTimeFrom.val(), 'HH:mm').utc().format('HH:mm:ss');
            data.EndTime = moment(ignoreTimeTo.val(), 'HH:mm').utc().format('HH:mm:ss');
            //console.log(data);
            var url = API_URL.URL_GEOFENCE_ADD;

            if (valEdit) {
                data.Code = valEdit;
                url = API_URL.URL_GEOFENCE_EDIT;
            }

            //console.log(data);
            saveGeofence(url, data);

        } else {
            if (errorList.length > 0) {
                var errorHtml = '';
                $.each(errorList, function(key, val) {
                    errorHtml += '- ' + val + '<br>';
                });
                App.alert(errorHtml);
            } else {
                App.alert(LANGUAGE.PROMPT_MSG009);
            }
        }

    });


});


App.onPageBeforeRemove('geofence.add', function(page) {
    // fix to close modal calendar if it was opened and default back button pressed
    App.closeModal('.custom-picker');

    MapTrack.off('draw:created', onMapGeofenceDraw);
});

App.onPageInit('delete.history', function (page) { 
    var assetCheckboxes = $$(page.container).find('input[type="checkbox"]');
    var imeis = [];
    var SearchForm = $$(page.container).find('.searchbarGeofence');
    var deleteHisoryList = $$(page.container).find('.delete_history_list');
    var MinorToken = getUserinfo().MinorToken;
    var UserPassword = localStorage.PASSWORD;
    initSearchbar(SearchForm);
    
    deleteHisoryList.on('click', '.item-content', function(){        
        var id = $$(this).data('id');
        App.modalPassword(LANGUAGE.PROMPT_MSG025, LANGUAGE.PROMPT_MSG024, function (password) {
            //App.alert('Thank you! Your password is: ' + password);
            if (password == UserPassword) {
                var url = API_URL.URL_DELETE_HYSTORY.format(MinorToken,id); 
                //console.log(url);
                App.showPreloader();
                JSON1.request(url, function(result){ 
                        console.log(result);                  
                        if (result.MajorCode == '000') { 
                            App.alert(LANGUAGE.PROMPT_MSG026);
                        }else{
                            App.alert(LANGUAGE.COM_MSG16);
                        }
                        App.hidePreloader();
                    },
                    function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); }
                ); 
            }else{
                App.alert(LANGUAGE.PROMPT_MSG027);
            }
        });
    });

    /*$$('.SaveDeleteHistory').on('click',function(){
        imeis = [];
        assetCheckboxes.each(function(){
            if( $$(this).prop('checked') ){
                imeis.push(this.value);
            }
        });
        //console.log(imeis);

        
    });*/
    
});




App.onPageInit('resetPwd', function (page) {     
    $$('.saveResetPwd').on('click', function(e){    
        var password = {
            old: $$(page.container).find('input[name="Password"]').val(),
            new: $$(page.container).find('input[name="NewPassword"]').val(),
            confirm: $$(page.container).find('input[name="NewPasswordConfirm"]').val()
        };
        
        if ($$(page.container).find('input[name="NewPassword"]').val().length >= 6) {
            if (password.new == password.confirm) {
                var userInfo = getUserinfo(); 
                var url = API_URL.URL_RESET_PASSWORD.format(userInfo.MinorToken,
                        encodeURIComponent(password.old),
                        encodeURIComponent(password.new)                    
                    ); 
                //console.log(url);
                App.showPreloader();
                JSON1.request(url, function(result){ 
                        //console.log(result);                  
                        if (result.MajorCode == '000') { 
                            App.alert(LANGUAGE.PROMPT_MSG003, function(){
                                logout();
                            });
                        }else{
                            App.alert('Wrong password');
                        }
                        App.hidePreloader();
                    },
                    function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); }
                ); 
            }else{
                App.alert(LANGUAGE.COM_MSG14);  //Passwords do not match
            }
        }else{
            App.alert(LANGUAGE.COM_MSG15); // Password should contain at least 6 characters
        }
    });
});

/*App.onPageInit('asset.alarm', function (page) {
    var alarm = $$(page.container).find('input[name = "checkbox-alarm"]');      

    var alarmFields = ['accOff','accOn','customAlarm','custom2LowAlarm','geolock','geofenceIn','geofenceOut','illegalIgnition','lowBattery','mainBatteryFail','sosAlarm','speeding','tilt', 'harshAcc', 'harshBrk'];  

    var allCheckboxesLabel = $$(page.container).find('label.item-content');
    var allCheckboxes = allCheckboxesLabel.find('input');
    

    alarm.on('change', function(e) { 
        if( $$(this).prop('checked') ){
            allCheckboxes.prop('checked', true);
        }else{
            allCheckboxes.prop('checked', false);
        }
    });

    allCheckboxes.on('change', function(e) { 
        if( $$(this).prop('checked') ){
            alarm.prop('checked', true);
        }
    });    
    
    $$('.saveAlarm').on('click', function(e){        
        var alarmOptions = {
            IMEI: TargetAsset.ASSET_IMEI,
            options: 0,            
        };

        if (alarm.is(":checked")) {
            alarmOptions.alarm = true;
        }

        $.each(alarmFields, function( index, value ) {
            var field = $$(page.container).find('input[name = "checkbox-'+value+'"]');
            if (!field.is(":checked")) {
                alarmOptions[value] = false;
                alarmOptions.options = alarmOptions.options + parseInt(field.val(), 10);
            }else{
                alarmOptions[value] = true;
            }
        });
                            
        console.log(alarmOptions);
        var userInfo = getUserinfo(); 
        var url = API_URL.URL_SET_ALARM.format(userInfo.MinorToken,
                alarmOptions.IMEI,
                alarmOptions.options                                
            );                    

        App.showPreloader();
        JSON1.request(url, function(result){ 
                console.log(result);                  
                if (result.MajorCode == '000') {                    
                    //setAlarmList(alarmOptions);
                    updateAlarmOptVal(alarmOptions);
                    mainView.router.back();
                }else{
                    App.alert('Something wrong');
                }
                App.hidePreloader();
            },
            function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG16); }
        ); 
        
    });
        
});*/

App.onPageInit('asset.alarm', function(page) {
    var alarm = $$(page.container).find('input[name = "checkbox-alarm"]');


    var allCheckboxes = $$(page.container).find('input.input-checkbox-alarm');

    var alarmPreferenceList = $$(page.container).find('.alarm_list');
    var ignoreBetweenEl = $$(page.container).find('[name="ignoreBetween"]');
    var pickerWrapperEl = $$(page.container).find('.picker-el-wrapper');
    var ignoreOnEl = $$(page.container).find('.ignore-on-wrapper');
    var BeginTimeInput = $$(page.container).find('[name="picker-from"]');
    var EndTimeInput = $$(page.container).find('[name="picker-to"]');
    var BeginTimeValArray = BeginTimeInput.val() ? BeginTimeInput.val().split(':') : [];
    var EndTimeInputArray = EndTimeInput.val() ? EndTimeInput.val().split(':') : [];

    var speedingInputEl = $$(page.container).find('input[name="checkbox-speeding"]');
    var overspeedRadioWrapperEl = $$(page.container).find('.overspeed-radio-wrapper');
    var overspeedRadioEl = $$(page.container).find('input[name="overspeed-radio"]');
    var overspeedVal = page.context.MaxSpeed ? page.context.MaxSpeed : 80;

    var offlineInputEl = $$(page.container).find('input[name="checkbox-offline"]');
    var offlineOptionsWrapperEl = $$(page.container).find('.offline-options-wrapper');
    var offlineOptionsEl = $$(page.container).find('input[name="offline-option"]');
    var showHintEl = $$(page.container).find('.showHint');

    showHintEl.on('click', function(){
        var parent = this.closest('.hintParent');
        var title = parent.getAttribute('data-hint-title');
        var text = parent.getAttribute('data-hint-text');

        var popoverHTML = `<div class="popover popover-status">
            ${ title ? `<p class="color-dealer">${ title }</p>` : '' }
            ${ text ? `<p >${ text }</p>` : '' }
            </div>`;
        App.popover(popoverHTML, this);
    });

    speedingInputEl.on('change', function() {
        if (this.checked) {
            overspeedRadioWrapperEl.removeClass('disabled');
        }  else{
            overspeedRadioWrapperEl.addClass('disabled');
        }
    });

    alarm.on('change', function(e) {
        for (var i = allCheckboxes.length - 1; i >= 0; i--) {
            allCheckboxes[i].checked = this.checked;
            if (allCheckboxes[i].name == 'checkbox-speeding' || allCheckboxes[i].name == 'checkbox-offline') {
                allCheckboxes[i].dispatchEvent(new Event('change'));
            }
        }
    });

    ignoreBetweenEl.on('change', function() {
        pickerWrapperEl.toggleClass('disabled');
        ignoreOnEl.toggleClass('disabled');
    });

    overspeedRadioEl.on('change', function(e) {
        if (e.target.value == 2) {
            App.modal({
                title: '<div class="custom-modal-logo-wrapper"><img class="custom-modal-logo" src="resources/images/logo.png" alt=""/></div>',
                text: '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG060 + ':</div>',
                afterText: `
                <div class="list-block list-block-modal m-0 no-hairlines ">          
                    <ul>                               
                        <li>
                            <div class="item-content pl-0">                                    
                                <div class="item-inner pr-0">                                      
                                    <div class="item-input item-input-field">
                                        <input type="tel" placeholder="${ LANGUAGE.PROMPT_MSG060 }" name="Overspeed" value="${ overspeedVal}" class="only_numbers">
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                `,
                buttons: [{
                    text: LANGUAGE.COM_MSG04,
                    onClick: function() {
                        for (var i = overspeedRadioEl.length - 1; i >= 0; i--) {
                            if (overspeedRadioEl[i].value == '1') {
                                overspeedRadioEl[i].checked = true;
                                break;
                            }
                        }
                    }
                },
                    {
                        text: LANGUAGE.COM_MSG38,
                        bold: true,
                        onClick: function(modal, e) {
                            //console.log(modal, e);
                            var enteredVal = $$(modal).find('input[name="Overspeed"]').val();
                            overspeedVal = enteredVal ? enteredVal : 1;
                        }
                    },
                ]
            });
        }
    });

    offlineInputEl.on('change', function(e) {
        for (var i = offlineOptionsEl.length - 1; i >= 0; i--) {
            offlineOptionsEl[i].checked = this.checked;
        }
        if (this.checked) {
            offlineOptionsWrapperEl.removeClass('disabled');
        } else{
            offlineOptionsWrapperEl.addClass('disabled');
        }
    });

    offlineOptionsEl.on('change', function(e) {
        let found = false;
        for (var i = offlineOptionsEl.length - 1; i >= 0; i--) {
            if (offlineOptionsEl[i].checked == true) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.checked = true;
            App.addNotification({
                hold: 3000,
                message: LANGUAGE.PROMPT_MSG061
            });
        }
    });


    if (!BeginTimeValArray || !BeginTimeValArray.length) {
        BeginTimeValArray = ['07', '00'];
    }
    if (!EndTimeInputArray || !EndTimeInputArray.length) {
        EndTimeInputArray = ['18', '00'];
    }
    var pickerFrom = App.picker({
        input: BeginTimeInput,
        cssClass: 'custom-picker custom-time',
        toolbarTemplate: '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left"><div class="text">' + LANGUAGE.GEOFENCE_MSG_29 + '</div></div>' +
            '<div class="right">' +
            '<a href="#" class="link close-picker color-black">{{closeText}}</a>' +
            '</div>' +
            '</div>' +
            '</div>',

        value: BeginTimeValArray,

        onChange: function(picker, values, displayValues) {

        },

        formatValue: function(p, values, displayValues) {
            return values[0] + ':' + values[1];
        },

        cols: [
            // Hours
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            },

            // Minutes
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    var pickerTo = App.picker({
        input: EndTimeInput,
        cssClass: 'custom-picker custom-time',
        toolbarTemplate: '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left"><div class="text">' + LANGUAGE.GEOFENCE_MSG_30 + '</div></div>' +
            '<div class="right">' +
            '<a href="#" class="link close-picker color-black">{{closeText}}</a>' +
            '</div>' +
            '</div>' +
            '</div>',

        value: EndTimeInputArray,

        onChange: function(picker, values, displayValues) {

        },

        formatValue: function(p, values, displayValues) {
            return values[0] + ':' + values[1];
        },

        cols: [
            // Hours
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            },

            // Minutes
            {
                values: (function() {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    $$(alarmPreferenceList).on('click', 'li.picker-el-wrapper', function(event) {
        event.stopPropagation();
        var input = $$(this).find('input');

        if (input) {
            var name = input.attr('name');
            switch (name) {
                case 'picker-from':
                    pickerFrom.open();
                    break;
                case 'picker-to':
                    pickerTo.open();
                    break;
            }
        }
    });

    $$('.saveAlarm').on('click', function(e) {
        var userInfo = getUserinfo();
        var ignoreDaysArr = $(page.container).find('[name="ignore-days"]').val();

        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            IMEIS: TargetAsset.ASSET_IMEI,
            DateFrom: moment(BeginTimeInput.val(), 'HH:mm').utc().format('HH:mm'),
            DateTo: moment(EndTimeInput.val(), 'HH:mm').utc().format('HH:mm'),
            AlertTypes: 0,
            Weeks: '',
            IsIgnore: 0,
        };

        if (ignoreBetweenEl.is(":checked")) {
            data.IsIgnore = 1;
        }
        if (ignoreDaysArr && ignoreDaysArr.length) {
            data.Weeks = ignoreDaysArr.toString();
        }
        if (allCheckboxes && allCheckboxes.length) {
            for (var i = allCheckboxes.length - 1; i >= 0; i--) {
                if (!allCheckboxes[i].checked) {
                    data.AlertTypes += parseInt(allCheckboxes[i].value, 10);
                }
            }
        }
        if (speedingInputEl.is(":checked")) {
            data.SpeedingMode = parseInt($$(page.container).find('input[name="overspeed-radio"]:checked').val(),10);
            if (data.SpeedingMode == 2) {
                data.MaxSpeed = overspeedVal;
            }
        }
        if (offlineInputEl.is(":checked")) {
            data.OfflineHours = '';
            for (var i = offlineOptionsEl.length - 1; i >= 0; i--) {
                if (offlineOptionsEl[i].checked) {
                    data.OfflineHours += offlineOptionsEl[i].value + ',';
                }
            }
            if (data.OfflineHours) {
                data.OfflineHours = data.OfflineHours.slice(0, -1);
            }
        }

        //console.log(data);

        App.showPreloader();
        $.ajax({
            type: "POST",
            url: API_URL.URL_SET_ALERT_CONFIG,
            data: data,
            async: true,
            cache: false,
            crossDomain: true,
            success: function(result) {
                App.hidePreloader();
                console.log(result);
                if (result.MajorCode == '000') {
                    mainView.router.back();

                    if (speedingInputEl.is(":checked")) {
                        var obj = {
                            IMEI: data.IMEIS,
                            Props: {
                                MaxSpeedAlertMode: data.SpeedingMode
                            }
                        };
                        if (data.SpeedingMode == 2) {
                            obj.Props.MaxSpeed = data.MaxSpeed;
                        }
                        updateAssetList3([obj]);
                    }

                } else {
                    App.alert(LANGUAGE.PROMPT_MSG013);
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }
        });

    });




});

App.onPageBeforeRemove('asset.alarm', function(page) {
    // fix to close modal calendar if it was opened and default back button pressed
    App.closeModal('.custom-picker');
});


App.onPageInit('asset.playback', function (page) {     

    var playbackListSettings = $$(page.container).find('.list-playback-settings'); 
    var today = new Date();
    var yesterday = new Date(new Date().setDate(new Date().getDate()-1));   
   
    var pickerStartDate = App.picker({
        input: '.picker-start-date',
        cssClass: 'custom-picker custom-date',
        //toolbarCloseText: '',
        toolbarTemplate:'<div class="toolbar">'+
                          '<div class="toolbar-inner">'+
                            '<div class="left"><div class="text">'+LANGUAGE.ASSET_PLAYBACK_MSG04+'</div></div>'+
                            '<div class="right">'+
                              '<a href="#" class="link close-picker color-black">{{closeText}}</a>'+
                            '</div>'+
                          '</div>'+
                        '</div>',
             
        value: [yesterday.getMonth(), yesterday.getDate(), yesterday.getFullYear()],
     
        onChange: function (picker, values, displayValues) {
            var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
            if (values[1] > daysInMonth) {
                picker.cols[1].setValue(daysInMonth);
            }
        },
     
        formatValue: function (p, values, displayValues) {
            if (Array.isArray(displayValues) && displayValues.length === 0) {
                displayValues[0] = moment(yesterday).format('MMMM');               
            }
            return displayValues[0] + ' ' + values[1] + ', ' + values[2];

        },
     
        cols: [
            // Months
            {
                values: ('0 1 2 3 4 5 6 7 8 9 10 11').split(' '),
                displayValues: [LANGUAGE.ASSET_PLAYBACK_MSG12,LANGUAGE.ASSET_PLAYBACK_MSG13,LANGUAGE.ASSET_PLAYBACK_MSG14,LANGUAGE.ASSET_PLAYBACK_MSG15,LANGUAGE.ASSET_PLAYBACK_MSG16,LANGUAGE.ASSET_PLAYBACK_MSG17,LANGUAGE.ASSET_PLAYBACK_MSG18,LANGUAGE.ASSET_PLAYBACK_MSG19,LANGUAGE.ASSET_PLAYBACK_MSG20,LANGUAGE.ASSET_PLAYBACK_MSG21,LANGUAGE.ASSET_PLAYBACK_MSG22,LANGUAGE.ASSET_PLAYBACK_MSG23],
                textAlign: 'left'
            },
            // Days
            {
                values: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
            },
            // Years
            {
                values: (function () {
                    var arr = [];
                    var endYear = today.getFullYear();
                    for (var i = 1950; i <= endYear; i++) { arr.push(i); }
                    return arr;
                })(),
            },
            /*// Space divider
            {
                divider: true,
                content: '  '
            }*/
        ]
    });

    var pickerStartTime = App.picker({
        input: '.picker-start-time',
        cssClass: 'custom-picker custom-time',
        toolbarTemplate:'<div class="toolbar">'+
                          '<div class="toolbar-inner">'+
                            '<div class="left"><div class="text">'+LANGUAGE.ASSET_PLAYBACK_MSG05+'</div></div>'+
                            '<div class="right">'+
                              '<a href="#" class="link close-picker color-black">{{closeText}}</a>'+
                            '</div>'+
                          '</div>'+
                        '</div>',
        
        value: [today.getHours(), (today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes())],
     
        onChange: function (picker, values, displayValues) {
            /*var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
            if (values[1] > daysInMonth) {
                picker.cols[1].setValue(daysInMonth);
            }*/
        },
     
        formatValue: function (p, values, displayValues) {
            return values[0] + ':' + values[1];
        },
     
        cols: [            
            // Hours
            {
                values: (function () {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i); }
                    return arr;
                })(),
            },
            // Divider
            /*{
                divider: true,
                content: ':'
            },*/
            // Minutes
            {
                values: (function () {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    var pickerEndtDate = App.picker({
        input: '.picker-end-date',
        cssClass: 'custom-picker custom-date',
        toolbarTemplate:'<div class="toolbar">'+
                          '<div class="toolbar-inner">'+
                            '<div class="left"><div class="text">'+LANGUAGE.ASSET_PLAYBACK_MSG06+'</div></div>'+
                            '<div class="right">'+
                              '<a href="#" class="link close-picker color-black">{{closeText}}</a>'+
                            '</div>'+
                          '</div>'+
                        '</div>',
             
        value: [today.getMonth(), today.getDate(), today.getFullYear()],
     
        onChange: function (picker, values, displayValues) {
            var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
            if (values[1] > daysInMonth) {
                picker.cols[1].setValue(daysInMonth);
            }
        },
     
        formatValue: function (p, values, displayValues) {            
            if (Array.isArray(displayValues) && displayValues.length === 0) {
                displayValues[0] = moment().format('MMMM');
            }
            return displayValues[0] + ' ' + values[1] + ', ' + values[2];
        },
     
        cols: [
            // Months
            {
                values: ('0 1 2 3 4 5 6 7 8 9 10 11').split(' '),
                displayValues: [LANGUAGE.ASSET_PLAYBACK_MSG12,LANGUAGE.ASSET_PLAYBACK_MSG13,LANGUAGE.ASSET_PLAYBACK_MSG14,LANGUAGE.ASSET_PLAYBACK_MSG15,LANGUAGE.ASSET_PLAYBACK_MSG16,LANGUAGE.ASSET_PLAYBACK_MSG17,LANGUAGE.ASSET_PLAYBACK_MSG18,LANGUAGE.ASSET_PLAYBACK_MSG19,LANGUAGE.ASSET_PLAYBACK_MSG20,LANGUAGE.ASSET_PLAYBACK_MSG21,LANGUAGE.ASSET_PLAYBACK_MSG22,LANGUAGE.ASSET_PLAYBACK_MSG23],
                textAlign: 'left'
            },
            // Days
            {
                values: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
            },
            // Years
            {
                values: (function () {
                    var arr = [];
                    var endYear = today.getFullYear();
                    for (var i = 1950; i <= endYear; i++) { arr.push(i); }
                    return arr;
                })(),
            },
            // Space divider
            /*{
                divider: true,
                content: '  '
            }*/
        ]
    });

    var pickerEndtTime = App.picker({
        input: '.picker-end-time',
        cssClass: 'custom-picker custom-time',
        toolbarTemplate:'<div class="toolbar">'+
                          '<div class="toolbar-inner">'+
                            '<div class="left"><div class="text">'+LANGUAGE.ASSET_PLAYBACK_MSG07+'</div></div>'+
                            '<div class="right">'+
                              '<a href="#" class="link close-picker color-black">{{closeText}}</a>'+
                            '</div>'+
                          '</div>'+
                        '</div>',
        
        value: [today.getHours(), (today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes())],
     
        onChange: function (picker, values, displayValues) {
            /*var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
            if (values[1] > daysInMonth) {
                picker.cols[1].setValue(daysInMonth);
            }*/
        },
     
        formatValue: function (p, values, displayValues) {
            return values[0] + ':' + values[1];
        },
     
        cols: [            
            // Hours
            {
                values: (function () {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i); }
                    return arr;
                })(),
            },
            // Divider
            /*{
                divider: true,
                content: ':'
            },*/
            // Minutes
            {
                values: (function () {
                    var arr = [];
                    for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
                    return arr;
                })(),
            }
        ]
    });

    $$('.showPlayback').on('click', function(){     
        var fromDate = $$(page.container).find('input[name="picker-start-date"]').val();
        var fromTime = $$(page.container).find('input[name="picker-start-time"]').val();
        var toDate = $$(page.container).find('input[name="picker-end-date"]').val();
        var toTime = $$(page.container).find('input[name="picker-end-time"]').val();
        var datepickerFormat = 'MMMM D, YYYY H:mm';

        var from = fromDate + ' ' + fromTime;
        var to = toDate + ' ' + toTime;

        from = moment(from, datepickerFormat).utc().format(window.COM_TIMEFORMAT2);
        to = moment(to, datepickerFormat).utc().format(window.COM_TIMEFORMAT2);   
        
        getHisPosArray(from, to);
    });      
         
    $$(playbackListSettings).on('click', 'li', function(event){
        event.stopPropagation();
        var input = $$(this).find('input');


        if (input) {
            var name = input.attr('name');            
            switch(name){
                case 'picker-start-date':
                    pickerStartDate.open();
                    break;
                case 'picker-start-time':
                    pickerStartTime.open();
                    break;
                case 'picker-end-date':
                    pickerEndtDate.open();
                    break;
                case 'picker-end-time':
                    pickerEndtTime.open();
                    break;
            }
            
        }
    });                         
 
});


App.onPageBeforeRemove('asset.playback', function(page){
    // fix to close modal calendar if it was opened and default back button pressed
    App.closeModal('.custom-picker');
});

App.onPageInit('asset.location', function (page) { 
    

    var panoButton = $$(page.container).find('.pano_button');
    var lat = panoButton.data('lat');
    var lng = panoButton.data('lng');
    var latlng = new google.maps.LatLng(lat, lng);
    showMap({'lat':lat,'lng':lng});
    StreetViewService.getPanorama({location:latlng, radius: 50}, processSVData);
    initSettingsButton();

    panoButton.on('click', function(){             
        var params = {
            'lat': $$(this).data('lat'),
            'lng': $$(this).data('lng'),
        };
        showStreetView(params);        
    });
});

App.onPageBeforeRemove('asset.location', function(page) {
    MapControls.isGeofencesShowed() ? MapControls.hideGeofences() : '';
});

App.onPageInit('asset.track.all', function(page) {
    showMapAll();
    var assetList = getAssetList();

    $$('.refreshTrack').on('click', function() {
        updateAssetsPosInfo();
    });

    trackTimer = setInterval(function() {
        updateAllMarkers(assetList);
    }, 10000);

    initSettingsButton();
});

App.onPageBeforeRemove('asset.track.all', function(page) {
    clearInterval(trackTimer);
    trackTimer = false;
    MapControls.isGeofencesShowed() ? MapControls.hideGeofences() : '';

});

App.onPageInit('asset.track', function (page) {     
    showMap();
    initSettingsButton();

    var posTime = $$(page.container).find('.position_time');
    //var posDir = $$(page.container).find('.position_direction');
    var posMileage = $$(page.container).find('.position_mileage');
    var posSpeed = $$(page.container).find('.position_speed');
    var posAddress = $$(page.container).find('.display_address');
    var routeButton = $$(page.container).find('.routeButton');
    var refreshTrack = $$(page.container).find('.refreshTrack');
    var sendPingButton = $$(page.container).find('.sendPing');
    var timerCurrentValBlock = $$(page.container).find('.timer_current_value');
    var pingTimerBox = $(page.container).find('.pingTimerBox');
    var timerVal = 60;
    var panoButton = $$(page.container).find('.pano_button');
    var lat = panoButton.data('lat');
    var lng = panoButton.data('lng');
    var latlng = new google.maps.LatLng(lat, lng);     
    var data = {
        'posTime':posTime,
        'posMileage':posMileage,
        'posSpeed':posSpeed,
        'posAddress':posAddress,
        'routeButton':routeButton,
        'panoButton':panoButton,
    };

    StreetViewService.getPanorama({location:latlng, radius: 50}, processSVData);
    panoButton.on('click', function(){             
        var params = {
            'lat': $$(this).data('lat'),
            'lng': $$(this).data('lng'),
        };
        showStreetView(params);        
    });

    var MinorToken = getUserinfo().MinorToken;
    

    refreshTrack.on('click', function(){   
        updateAssetData(data);
        
        timerVal = 60;
        timerCurrentValBlock.html(timerVal);         
    });


    timerCurrentValBlock.html(timerVal);
    trackTimer = setInterval(function(){
                if (timerVal === 0) {
                    updateMarkerPositionTrack(data);
                    timerVal = 60;
                    
                }else{
                    timerVal--;
                }   
                timerCurrentValBlock.html(timerVal);          
            }, 1000);   

    var time = 0;
    var maxTime = 59;
    pingTimerBox.knob({
      readOnly : true,
      thickness : 0.2,
      max : maxTime
    });

    sendPingButton.on('click', function(){
        //var button = $$(this);
        if (!pingTimer) {
            var container = $$('body');
            if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
            App.showProgressbar(container); 
           
            var url = API_URL.URL_GET_POSITION_GPRS.format(MinorToken,TargetAsset.ASSET_ID); 
             //console.log(url);  
            JSON1.request(url, function(result) {           
                    console.log(result);
                    if(result.MajorCode == '000') {
                        setTimeout(updateAssetDataByGPRS,10000);
                        setTimeout(updateAssetDataByGPRS,20000);
                        setTimeout(updateAssetDataByGPRS,30000);
                        
                    }else if(result.MajorCode == '100' && result.MinorCode == '1002'){
                        App.alert(LANGUAGE.COM_MSG29);
                    }else{
                        App.alert(LANGUAGE.COM_MSG16);
                    }
                    App.hideProgressbar(); 
                },
                function(){ App.hideProgressbar();  App.alert(LANGUAGE.COM_MSG02); }
            ); 
        }
        
        $$('.sendPing').closest('.float_button_wrapper').addClass('disabled');
        
        pingTimer = setInterval(function() {
            if(time>=maxTime){              
                $$('.sendPing').closest('.float_button_wrapper').removeClass('disabled'); 
                time = 0;
                clearInterval(pingTimer);
                pingTimer = false;              
            }else{
                time++;
            }
            
            pingTimerBox
                .val(time)
                .trigger('change');
        }, 1000);

        
    }); 

       
    if (pingTimer) {
        sendPingButton.closest('.float_button_wrapper').addClass('disabled');
    }
    


        
});

App.onPageBeforeRemove('asset.track', function(page){
    clearInterval(trackTimer);
    trackTimer = false;
    MapControls.isGeofencesShowed() ? MapControls.hideGeofences() : '';
});

App.onPageInit('asset.playback.show', function (page) {
    var rangeInput = $$(page.container).find('input[name="rangeInput"]');
    var rangeInputSpeed = $$(page.container).find('input[name="rangeInputSpeed"]');
    var startPlayback = $$('body').find('.startPlayback');
    var startPlaybackIco = $$(startPlayback).find('i');
    showMapPlayback();
    var valueMax = HistoryArray.length - 1;
    rangeInput.attr('max',valueMax);
    var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];

    var lastQueryPosinfo = {};//get last  query  position       

    var posTime = $$(page.container).find('.position_time');
    //var posDir = $$(page.container).find('.position_direction');
    var posMileage = $$(page.container).find('.position_mileage');
    var posSpeed = $$(page.container).find('.position_speed');
    var posAddress = $$(page.container).find('.display_address');

    var panoButton = $$(page.container).find('.pano_button');
    var lat = panoButton.data('lat');
    var lng = panoButton.data('lng');
    
    StreetViewService.getPanorama({location:new google.maps.LatLng(lat, lng), radius: 50}, processSVData);

    panoButton.on('click', function(){             
        var params = {
            'lat': $$(this).data('lat'),
            'lng': $$(this).data('lng'),
        };
        showStreetView(params);        
    });
    
    rangeInput.on('change input', function(){      
        var value = $$(this).val();
        updateMarkerPositionPlayback(value);
    });   
    
    
    startPlayback.on('click', function(){
        if (playbackTimer) {
            $$(startPlaybackIco).removeClass('icon-header-pause'); 
            $$(startPlaybackIco).addClass('icon-header-play'); 

            clearInterval(playbackTimer);
            playbackTimer = false;               
        }else{
            $$(startPlaybackIco).removeClass('icon-header-play');
            $$(startPlaybackIco).addClass('icon-header-pause');        
            
            var interval = 1000 / rangeInputSpeed.val();
            playbackTimer = setInterval(playbackIntrvalFunc, interval);            
        }
    });

    $$('.menuRoutes').on('click', function() {
        var buttons = [{
            text: LANGUAGE.ASSET_PLAYBACK_MSG28,
            label: true,

        },
            {
                text: LANGUAGE.ASSET_PLAYBACK_MSG29,
                //color: 'boatwatch',
                onClick: function() {
                    showPlaybackRoute(2); //optimized
                }
            },
            {
                text: LANGUAGE.ASSET_PLAYBACK_MSG30,
                //color: 'boatwatch',
                onClick: function() {
                    showPlaybackRoute(1); //raw
                }
            },
            {
                text: LANGUAGE.COM_MSG04,
                color: 'red',
            },
        ];
        App.actions(buttons);
    });

    function playbackIntrvalFunc(){ 
        clearInterval(playbackTimer);
        var interval = 1000 / rangeInputSpeed.val();
        playbackTimer = setInterval(playbackIntrvalFunc, interval);

        var value = rangeInput.val(); 
        if (value != valueMax) {
            value++;
            rangeInput.val(value);                    
        }else{
            rangeInput.val(0);
            value = 0;
            clearInterval(playbackTimer);
            updateMarkerPositionPlayback(0);
            playbackTimer = false;  
            $$(startPlaybackIco).removeClass('icon-header-pause'); 
            $$(startPlaybackIco).addClass('icon-header-play');                    
        } 
        updateMarkerPositionPlayback(value); 
    }  


    function updateMarkerPositionPlayback(value){

        window.PosMarker[TargetAsset.ASSET_IMEI].setLatLng([HistoryArray[value].lat, HistoryArray[value].lng]);
        posTime.html(moment(HistoryArray[value].positionTime,'X').format(window.COM_TIMEFORMAT));
        //posDir.html(asset.posInfo.direct);        
        posMileage.html((Protocol.Helper.getMileageValue(asset.Unit, HistoryArray[value].mileage) + parseInt(asset.InitMileage) + parseInt(asset._FIELD_FLOAT7)) + '&nbsp;' + Protocol.Helper.getMileageUnit(asset.Unit)); 
        posSpeed.html(Protocol.Helper.getSpeedValue(asset.Unit, HistoryArray[value].speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit));
        MapTrack.setView([HistoryArray[value].lat, HistoryArray[value].lng]);   

        var MarkerData = getMarkerDataTablePB(asset, HistoryArray[value]);
        //console.log(MarkerData);
        window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(MarkerData); 

        if(lastQueryPosinfo && Math.floor(HistoryArray[value].lat * 10000) / 10000 === lastQueryPosinfo.lat && Math.floor(HistoryArray[value].lng * 10000) / 10000 === lastQueryPosinfo.lng ){            
            posAddress.html(lastQueryPosinfo.address);

            HistoryArray[value].customAddress = lastQueryPosinfo.address;  
            MarkerData = getMarkerDataTablePB(asset, HistoryArray[value]);
            window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(MarkerData); 
        }else{    
            var latlng = {
                lat: HistoryArray[value].lat,
                lng: HistoryArray[value].lng
            };

            updatePanoButton(latlng);
            Protocol.Helper.getAddressByGeocoder(latlng,function(address){
                lastQueryPosinfo = {lat : Math.floor(latlng.lat * 10000) / 10000, lng : Math.floor(latlng.lng * 10000) / 10000, address: address };
                posAddress.html(address); 

                HistoryArray[value].customAddress = address;              
                if (HistoryArray[value+1]) {
                    HistoryArray[value+1].customAddress = address; 
                }
                          
                MarkerData = getMarkerDataTablePB(asset, HistoryArray[value]);
                window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(MarkerData);                
            });
        }
    }
    function updatePanoButton(params) {
        panoButton.data('lat',params.lat);
        panoButton.data('lng',params.lng);
        StreetViewService.getPanorama({location:new google.maps.LatLng(params.lat,params. lng), radius: 50}, processSVData);
    }
  
});

App.onPageBeforeRemove('asset.playback.show', function(page){
    clearInterval(playbackTimer);
    playbackTimer = false;
    HistoryArray = [];
    EventsArray = [];
    layerControl = false;
    playbackLayerGroup = false;
    playbackLayerGroupOpt = false;
});




 


function clearUserInfo(){
    getPlusInfo();
    var mobileToken = !localStorage.PUSH_MOBILE_TOKEN? '' : localStorage.PUSH_MOBILE_TOKEN;
    var appId = !localStorage.PUSH_APPID_ID? '' : localStorage.PUSH_APPID_ID;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN? '' : localStorage.PUSH_DEVICE_TOKEN;
    var userName = !localStorage.ACCOUNT? '' : localStorage.ACCOUNT;
    var userInfo = getUserinfo();
    var MinorToken = userInfo.MinorToken;      
    var MajorToken = userInfo.MajorToken;
    window.PosMarker = {};
	TargetAsset = {};
	POSINFOASSETLIST = {}; 
    var alarmList = getAlarmList();    
    //var pushList = getNotificationList();
    var mapSettingsObg = getMapSettings();

    var ModalReview = !localStorage.ModalReview ? '' : localStorage.ModalReview;
    var FirstLoginDone = !localStorage.FirstLoginDone ? '' : localStorage.FirstLoginDone;
    
    localStorage.clear();
    localStorage.loginDone = 0;

    if(push) {
        push.clearAllNotifications(
            function () {
                console.log('success');
            },
            function () {
                console.log('error');
            }
        );
    }
    
    if (updateAssetsPosInfoTimer) {
        clearInterval(updateAssetsPosInfoTimer);
    }

    if (virtualAssetList) {
        virtualAssetList.deleteAllItems();
    }
    
    if (alarmList) {
        localStorage.setItem("COM.QUIKTRAK.LIVE.ALARMLIST", JSON.stringify(alarmList)); 
    }
    if (mapSettingsObg) {
        localStorage.setItem("COM.QUIKTRAK.LIVE.MAPSETTINGS", JSON.stringify(mapSettingsObg));
    }

    if (updateAssetsPosInfoTimer) {
        clearInterval(updateAssetsPosInfoTimer);
    }
    if (ModalReview) {
        localStorage.ModalReview = ModalReview;
    }
    if (FirstLoginDone) {
        localStorage.FirstLoginDone = FirstLoginDone;
    }

    if (deviceToken) {
        localStorage.PUSH_DEVICE_TOKEN = deviceToken; 
    }    
    if (mobileToken) {
        localStorage.PUSH_MOBILE_TOKEN = mobileToken;
    }
    /*    
    if (pushList) {
        localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST", JSON.stringify(pushList));
    }*/
    
    JSON1.request(API_URL.URL_GET_LOGOUT.format(mobileToken, deviceToken), function(result){ console.log(result); });
    $$("input[name='account']").val(userName);
}


function logout(){  
    clearUserInfo();
    App.loginScreen();   
}

function preLogin(){
    hideKeyboard();
    getPlusInfo();
    App.showPreloader();
    if  (localStorage.PUSH_DEVICE_TOKEN){             
        login();
    }else{              
        loginInterval = setInterval( reGetPushDetails, 500);                
    }
}

function reGetPushDetails(){
    //hideKeyboard();
    getPlusInfo();
    if  (pushConfigRetry <= pushConfigRetryMax){
        pushConfigRetry++;
        if  (localStorage.PUSH_DEVICE_TOKEN){                 
            clearInterval(loginInterval);
            login();
        }               
    }else{       
        clearInterval(loginInterval);     
        pushConfigRetry = 0;   
        login();
        //setTimeout(function(){
        //    App.alert(LANGUAGE.PROMPT_MSG052);
        //},2000);
    }           
}

function login(){ 
    //alert('login() called');   
    getPlusInfo();
    //hideKeyboard();

    //App.showPreloader();
    var mobileToken = !localStorage.PUSH_MOBILE_TOKEN? '' : localStorage.PUSH_MOBILE_TOKEN;
    var appKey = !localStorage.PUSH_APP_KEY? '' : localStorage.PUSH_APP_KEY;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN? '' : localStorage.PUSH_DEVICE_TOKEN;
    var deviceType = !localStorage.DEVICE_TYPE? '' : localStorage.DEVICE_TYPE;
    var account = $$("input[name='account']");
    var password = $$("input[name='password']"); 

    var urlLogin = API_URL.URL_GET_LOGIN.format(!account.val()? localStorage.ACCOUNT: account.val(), 
                                     encodeURIComponent(!password.val()? localStorage.PASSWORD: password.val()), 
                                     appKey, 
                                     mobileToken, 
                                     encodeURIComponent(deviceToken), 
                                     deviceType);                                
    JSON1.request(urlLogin, function(result){
           console.log(result);
            if(result.MajorCode == '000') {
                if(!!account.val()) {
                    localStorage.ACCOUNT = account.val();
                    localStorage.PASSWORD = password.val();
                }
                account.val(null);
                password.val(null);
                setUserinfo(result.Data);
                setAssetList(result.Data.Devices);               
               
                //init_AssetList(); 
                //initSearchbar();  
                //webSockConnect();
                getNewNotifications();

                App.closeModal();                
            }else{                
                App.loginScreen(); 
                App.alert(LANGUAGE.LOGIN_MSG01);
            }
            App.hidePreloader();
        },
        function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); App.loginScreen(); }
    ); 
   
}

function refreshToken(newDeviceToken){
    console.log('refreshToken() called');
    var userInfo = getUserinfo();

    if (localStorage.PUSH_MOBILE_TOKEN && userInfo.MajorToken && userInfo.MinorToken && newDeviceToken) {
        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            MobileToken: localStorage.PUSH_MOBILE_TOKEN,
            DeviceToken: newDeviceToken,             
        };
      
        //console.log(urlLogin);                             
        JSON1.requestPost(API_URL.URL_REFRESH_TOKEN, data, function(result){                
                if(result.MajorCode == '000') {
                                    
                }else{                
                   
                }                
            },
            function(){ console.log('error during refresh token');  }
        ); 
    }else{
        console.log('not loggined');
    }
        
}

function hideKeyboard() {
    document.activeElement.blur();
    $$("input").blur();
}

function init_AssetList() {
    var assetList = getAssetList();   
    
    var newAssetlist = [];
    var keys = Object.keys(assetList);
    
    $.each(keys, function( index, value ) {        
        newAssetlist.push(assetList[value]);       
    });

    /*newAssetlist.sort(function(a,b){
        if(a.Name < b.Name) return -1;
        if(a.Name > b.Name) return 1;
        return 0;
    });*/
    newAssetlist = sortListByState(newAssetlist, 'state');
    
    mainView.router.back({
        pageName: 'index', 
        force: true
    }); 
  
    virtualAssetList.replaceAllItems(newAssetlist);   
    
    
    //setTimeout(function(){
        updateAssetsPosInfoTimer = setInterval(function(){
            updateAssetsPosInfo();
        }, 15000);
    //}, 15000);
    
    
}



function initSearchbar(searchContainer){  
    if (!searchContainer) {
        if (searchbar) {        
            searchbar.destroy();
        }
        searchbar = App.searchbar('.searchbar', {
            searchList: '.list-block-search',
            searchIn: '.item-title',
            found: '.searchbar-found',
            notFound: '.searchbar-not-found',
            
        });
    }else{
        if (searchbarGeofence) {        
            searchbarGeofence.destroy();
        }
        searchbarGeofence = App.searchbar(searchContainer, {
            searchList: '.list-block-search-geofence',
            searchIn: '.item-title',
            found: '.searchbar-found-geofence',
            notFound: '.searchbar-not-found-geofence',
            
        });
    }
        
}



function loadProfilePage(){
    var userInfo = getUserinfo().User;    
    mainView.router.load({
        url:'resources/templates/profile.html',
        context:{
            FirstName: userInfo.FirstName,
            SubName: userInfo.SubName,
            Mobile: userInfo.Mobile,
            Phone: userInfo.Phone,            
            EMail: userInfo.EMail,            
        }
    });
}

function loadSettingsPage(){
    mainView.router.load({
        url:'resources/templates/settings.html',
        context:{
                 
        }
    });
}
function loadDeleteHistoryPage(){
    var assetList = getAssetList();

    var assets = [];
    if (assetList) {
        $.each(assetList, function(index, value) {           
            value.AssetImg = getAssetImg(value, {'assetList':true});            
            assets.push(value);
        });         
    }
    assets.sort(function(a,b){
        if(a.Name < b.Name) return -1;
        if(a.Name > b.Name) return 1;
        return 0;
    });
    console.log(assets);
    mainView.router.load({
        url:'resources/templates/delete.history.html',
        context: {
            Assets: assets
        },
    });
}

function loadGeofencePage(){
    var userInfo = getUserinfo();

    var data = {
        MajorToken: userInfo.MajorToken,
        MinorToken: userInfo.MinorToken                
    };
    
    App.showPreloader();
    $.ajax({
           type: "POST",
            url: API_URL.URL_GET_GEOFENCE_LIST,
           data: data,
          async: true,           
    crossDomain: true, 
          cache: false,
        success: function (result) {            
            App.hidePreloader();                    
            if (result.MajorCode == '000' ) {
                var geofenceList = result.Data;
                setGeoFenceList(geofenceList);                
                //console.log(result);
                mainView.router.load({
                    url:'resources/templates/geofence.html',                     
                    context:{
                                  
                    }
                });
                $$('#map').remove();
            }else{
                App.alert(LANGUAGE.PROMPT_MSG013);
            }
                 

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
           App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02);
        }
    });

    
}

function loadAlarmsAssetsPage(){
    mainView.router.load({
                    url:'resources/templates/alarms.assets.html',                     
                    context:{
                                  
                    }
                });
}

function loadPageSupport(){
    var userInfo = getUserinfo().User;  

    var param = {
        'name': '',
        'loginName':'',
        'email':'',
        'phone':'',
        'service':'3', //means quikloc8.co in support page
    };
    
    if (userInfo.FirstName) {
        param.name = userInfo.FirstName.trim();
    }
    if (userInfo.SubName) {
        param.name = param.name + ' ' + userInfo.SubName.trim();
        param.name = param.name.trim();
    }
    if (localStorage.ACCOUNT) {
        param.loginName = localStorage.ACCOUNT.trim();
        param.loginName = encodeURIComponent(param.loginName);
    }
    if (userInfo.EMail) {
        param.email = userInfo.EMail.trim();
        param.email = encodeURIComponent(param.email);
    }
    if (userInfo.Mobile) {
        param.phone = userInfo.Mobile.trim();
        param.phone = encodeURIComponent(param.phone);
    }    
    if (param.name) {
        param.name = encodeURIComponent(param.name);
    }
  
    var href = API_URL.URL_SUPPORT.format(param.name,param.loginName,param.email,param.phone,param.service); 
    
    /*if (typeof navigator !== "undefined" && navigator.app) {                
            navigator.app.loadUrl(href, {openExternal: true}); 
        } else {
            window.open(href,'_blank');
        }*/
    window.open(href, '_blank', 'location=yes');
}

function loadPageViewAll() {

    checkMapExisting();
    mainView.router.load({
        url: 'resources/templates/asset.track.all.html',
        context: {

        }
    });
}

function loadResetPwdPage(){
    mainView.router.load({
        url:'resources/templates/resetPwd.html',
        context:{
                     
        }
    });
}

function getAssetImg(params, imgFor){
    var assetImg = '';
    if (params && imgFor.assetList) {
        var pattern = /^IMEI_/i;   
        if (params.Icon && pattern.test(params.Icon)) {
            assetImg = '<img class="item_asset_img" src="https://upload.quiktrak.co/Attachment/images/'+params.Icon+'?'+ new Date().getTime()+'alt="">';
        }else if (params.Name) {
            params.Name = $.trim(params.Name);
            var splitted = params.Name.split(' ');             
            if (splitted.length > 1) {
                assetImg = '<div class="item_asset_img bg-dealer"><div class="text-a-c vertical-center user_f_l">'+splitted[0][0]+splitted[1][0]+'</div></div>';            
            }else{
                assetImg = '<div class="item_asset_img bg-dealer"><div class="text-a-c vertical-center user_f_l">'+params.Name[0]+params.Name[1]+'</div></div>';            
            }
            
        }else if(params.IMEI){
            assetImg = '<div class="item_asset_img bg-dealer"><div class="text-a-c vertical-center user_f_l">'+params.IMEI[0]+params.IMEI[1]+'</div></div>';
        }
    }else{
        assetImg = '<div class="item_asset_img bg-dealer"><div class="text-a-c vertical-center user_f_l">?</div></div>';
    }
    return assetImg;
}

function processSVData(data, status) {
    var SVButton = $$(document).find('.pano_button');
    var parrent = SVButton.closest('.pano_button_wrapper');
    
    if (SVButton) {
        if (status === 'OK') {
            parrent.removeClass('disabled');
        } else {
            parrent.addClass('disabled');
            console.log('Street View data not found for this location.');
        }
    }        
}

function showStreetView(params){ 
    var dynamicPopup = '<div class="popup">'+
                              '<div class="float_button_wrapper back_button_wrapper close-popup"><div class="float_button_content"><i class="f7-icons">close</i></div></div>'+
                              '<div class="pano_map">'+
                                '<div id="pano" class="pano" ></div>'+                        
                              '</div>'+
                            '</div>';            
    App.popup(dynamicPopup);

    var panoramaOptions = {
            position: new google.maps.LatLng(params.lat, params.lng),
            pov: {
                heading: 0,
                pitch: 0
            },
            linksControl: false,
            panControl: false,
            enableCloseButton: false,
            addressControl: false
    };
    var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'),panoramaOptions);      
}

function getGeofenceDataTable(geofence, options){

    //console.log(geofence);
    var markerData = '';
    if (geofence) {
        let assignedAssets = '';
        let assetList = getAssetList();
        let assignedAssetsCount = '0';
        let BeginTime = '';
        let EndTime = '';
        let IgnoreDays = '';

        if (options && options.geogroup) {
            if (geofence.Assets && geofence.Assets.length) {
                assignedAssetsCount = geofence.Assets.length;
                for (var i = geofence.Assets.length - 1; i >= 0; i--) {
                    assignedAssets += geofence.Assets[i].Name + ', ';
                }
            }
        }else{
            if (geofence.SelectedAssetList && geofence.SelectedAssetList.length) {
                assignedAssetsCount = geofence.SelectedAssetList.length;
                for (var i = geofence.SelectedAssetList.length - 1; i >= 0; i--) {
                    if (assetList[geofence.SelectedAssetList[i].IMEI]){
                        assignedAssets += assetList[geofence.SelectedAssetList[i].IMEI].Name + ', ';
                    }else{
                        assignedAssets += LANGUAGE.COM_MSG27 + ', ';
                    }
                }
            }
        }
        if (assignedAssets) {
            assignedAssets = assignedAssets.slice(0, -2);
        }else{
            assignedAssets = LANGUAGE.COM_MSG58;
        }

        if (geofence.Week && geofence.Week.length) {
            for (var i = 0; i < geofence.Week.length; i++) {
                IgnoreDays += geofence.Week.length > 2 ? Protocol.DaysOfWeek[geofence.Week[i].Week].nameSmall + ', ' : Protocol.DaysOfWeek[geofence.Week[i].Week].name + ', ';
            }
            if (IgnoreDays) {
                IgnoreDays = IgnoreDays.slice(0, -2);
            }
            BeginTime = geofence.Week[0].BeginTime ? moment(geofence.Week[0].BeginTime, 'HH:mm:ss').add(UTCOFFSET, 'minutes').format('HH:mm:ss') : BeginTime;
            EndTime = geofence.Week[0].EndTime ? moment(geofence.Week[0].EndTime, 'HH:mm:ss').add(UTCOFFSET, 'minutes').format('HH:mm:ss') : EndTime;
        }


        markerData += `
        <table cellpadding="0" cellspacing="0" border="0" class="marker-data-table">
            <tr>
               <td class="marker-data-caption">${ options && options.geogroup ? LANGUAGE.GEOFENCE_MSG_34 : LANGUAGE.GEOFENCE_MSG_32}</td>
               <td class="marker-data-value">${ geofence.Name }</td>
            </tr>
            <tr>
                <td class="marker-data-caption">${ LANGUAGE.GEOFENCE_MSG_33 }(${ assignedAssetsCount })</td>
                <td class="marker-data-value">${ assignedAssets }</td>
            </tr>           
            `;

        if (options && !options.geogroup) {
            markerData += `
                <tr>
                    <td class="marker-data-caption">${ LANGUAGE.GEOFENCE_MSG_07 }</td>
                    <td class="marker-data-value">${ Protocol.Helper.getGeofenceAlertType(geofence.Alerts) }</td>
                </tr>
                <tr>
                   <td class="marker-data-caption">${ LANGUAGE.COM_MSG37 }</td>
                   <td class="marker-data-value">${ geofence.State == 1 ? LANGUAGE.COM_MSG59 : LANGUAGE.COM_MSG60 }</td>
                </tr>
                
            `;
        /*<tr>
            <td class="marker-data-caption">${ LANGUAGE.GEOFENCE_MSG_28 }</td>
                <td class="marker-data-value">${ geofence.Inverse == 1 ? LANGUAGE.COM_MSG59 : LANGUAGE.COM_MSG60 }</td>
                </tr>*/
            /*if (geofence.Inverse == 1) {
                markerData += `
                    <tr>
                       <td class="marker-data-caption">${ LANGUAGE.ASSET_TRACK_ALL_MSG021 }</td>
                       <td class="marker-data-value">${ BeginTime } - ${ EndTime }</td>
                    </tr>
                    <tr>
                       <td class="marker-data-caption">${ LANGUAGE.GEOFENCE_MSG_31 }</td>
                       <td class="marker-data-value">${ IgnoreDays }</td>
                    </tr>
                `;
            }*/
        }

        markerData += ` 
            <tr>
                <td class="marker-data-caption">${ LANGUAGE.ASSET_TRACK_ALL_MSG011 }</td>
                <td class="marker-data-value ">${ Protocol.Helper.convertDMS(geofence.Lat, geofence.Lng) }</td>
            </tr>
            <tr>
                <td class="marker-data-caption">${ LANGUAGE.ASSET_TRACK_ALL_MSG012 }</td>
                <td class="marker-data-value address-${ geofence.Code }">${ geofence.Address }</td>
            </tr>
        </table>`;
    }
    return markerData;
}

function showMap(params){ 
    var asset = TargetAsset.ASSET_IMEI;   
    var latlng = [];
    if (params) {
        latlng = [params.lat, params.lng];
    }else{
        latlng = [POSINFOASSETLIST[asset].posInfo.lat, POSINFOASSETLIST[asset].posInfo.lng];   
    }
       
    MapTrack = Protocol.Helper.createMap({ target: 'map', latLng: latlng, zoom: 15 });   
    window.PosMarker[asset].addTo(MapTrack);

    if (!StreetViewService) {
        StreetViewService = new google.maps.StreetViewService();
    }
}

function showMapAll(params) {

    var latlng = [0,0];

    MapTrack = Protocol.Helper.createMap({ target: 'map', latLng: latlng, zoom: 15 });
    //window.PosMarker[asset].addTo(MapTrack);
    var assetList = getAssetList();
    AllMarkersGroup = L.markerClusterGroup({'maxClusterRadius':35});
    if (assetList) {
        var point = '';
        var markerData = '';
        $.each(assetList, function(key, value){
            point = '';
            markerData = '';
            if (POSINFOASSETLIST[key] && POSINFOASSETLIST[key].posInfo && parseFloat(POSINFOASSETLIST[key].posInfo.lat) !== 0 && parseFloat(POSINFOASSETLIST[key].posInfo.lng) !== 0) {
                point = L.marker([POSINFOASSETLIST[key].posInfo.lat,POSINFOASSETLIST[key].posInfo.lng], {icon: Protocol.MarkerIcon[1]});
                markerData = getMarkerDataTable(POSINFOASSETLIST[key]);
                point
                    .bindPopup(markerData,{maxWidth: 280, closeButton: false})
                    .on('popupopen', function (e) {
                        if (!POSINFOASSETLIST[key].posInfo.customAddress) {
                            Protocol.Helper.getAddressByGeocoder({lat: POSINFOASSETLIST[key].posInfo.lat, lng: POSINFOASSETLIST[key].posInfo.lng},function(address){
                                POSINFOASSETLIST[key].posInfo.customAddress = address;
                                markerData = getMarkerDataTable(POSINFOASSETLIST[key]);
                                e.target.setPopupContent(markerData);
                                e.popup.update();
                            });
                        }
                    });
                /*if (app.device.desktop) {
                    point.bindTooltip(POSINFOASSETLIST[key].Name,{permanent: false, direction: 'right'});
                }*/
                point._custom_asset_imei = key;
                point.addTo(AllMarkersGroup);
                POSINFOASSETLIST[key].markerId = AllMarkersGroup.getLayerId(point);
            }
        });
        if (AllMarkersGroup.getBounds().isValid()) {
            /*console.log(AllMarkersGroup.getBounds().isValid());*/
            MapTrack.fitBounds(AllMarkersGroup.getBounds(),{padding:[16,16]});
            AllMarkersGroup.addTo(MapTrack);
        }
    }
}

function updateAllMarkers(assetList){

    $.each(assetList, function(key, value){
        if (POSINFOASSETLIST[key] && POSINFOASSETLIST[key].posInfo && POSINFOASSETLIST[key].posInfo.lat !== 0 && POSINFOASSETLIST[key].posInfo.lng !== 0) {
            var markerData = getMarkerDataTable(POSINFOASSETLIST[key]);
            var point = AllMarkersGroup.getLayer(POSINFOASSETLIST[key].markerId);
            if (point) {
                point.setLatLng([POSINFOASSETLIST[key].posInfo.lat, POSINFOASSETLIST[key].posInfo.lng]).setPopupContent(markerData);
                var popup = point.getPopup();
                if (popup.isOpen()) {
                    popup.update();
                    Protocol.Helper.getAddressByGeocoder({lat: POSINFOASSETLIST[key].posInfo.lat, lng: POSINFOASSETLIST[key].posInfo.lng},function(address){
                        POSINFOASSETLIST[key].posInfo.customAddress = address;
                        if (popup.isOpen()) {
                            markerData = getMarkerDataTable(POSINFOASSETLIST[key]);
                            point.setPopupContent(markerData);
                            popup.update();
                        }
                    });
                }
            }
        }
    });

}

function showMapPlayback() {
    var optimizedState = $$('body .playback_page').find('input[name="optimizedState"]');
    var asset = TargetAsset.ASSET_IMEI;
    var latlng = [POSINFOASSETLIST[asset].posInfo.lat, POSINFOASSETLIST[asset].posInfo.lng];

    MapTrack = Protocol.Helper.createMap({ target: 'map', latLng: latlng, zoom: 15 });
    window.PosMarker[asset].addTo(MapTrack);

    if (!StreetViewService) {
        StreetViewService = new google.maps.StreetViewService();
    }

    var polylinePoints = [];

    $.each(HistoryArray, function(index, value) {
        var point = new L.LatLng(value.lat, value.lng);
        polylinePoints.push(point);
    });

    //console.log(EventsArray);
    if (EventsArray) {
        var eventPoints = L.markerClusterGroup({ 'maxClusterRadius': 35, });
        var markerIcon = L.icon({
            iconUrl: 'resources/images/info-pin.svg',
            iconSize: [32, 32], // size of the icon
            iconAnchor: [16, 31], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -32] // point from which the popup should open relative to the iconAnchor
        });
        var markerData = '';
        var point = '';
        var popupAddresses = {};

        $.each(EventsArray, function(index, value) {
            if (parseFloat(value.lat) !== 0 && parseFloat(value.lng) !== 0) {
                if (value.eventClass == 4 && value.eventType == 0) { //filtering to display only   1-Alert(alarms) , 2-ACC , 4 - static  events
                    value.index = index;
                    markerData = getMarkerDataTableInfoPin(value);
                    point = L.marker([value.lat, value.lng], { icon: markerIcon });
                    point.bindPopup(markerData, { "maxWidth": 260 })
                        .on('popupopen', function(marker) {
                            if (popupAddresses[index]) {
                                $$('body .position_map').find('[data-popupIdAddress="' + index + '"]').html(popupAddresses[index]);
                            } else {
                                Protocol.Helper.getAddressByGeocoder(this.getLatLng(), function(address) {
                                    $$('body .position_map').find('[data-popupIdAddress="' + index + '"]').html(address);
                                    popupAddresses[index] = address;
                                });
                            }
                        });
                    eventPoints.addLayer(point);
                }
            }
        });
        MapTrack.addLayer(eventPoints);
    }

    var polylineCustomization = {
        'mainBg': {
            color: '#6199CC',
            weight: 6,
            opacity: 1,
        },
        'main': {
            color: '#00B1FC',
            weight: 3,
            opacity: 1,
        },

    };
    var polylineBG = new L.Polyline(polylinePoints, polylineCustomization.mainBg);
    var polyline = new L.Polyline(polylinePoints, polylineCustomization.main);

    playbackLayerGroup = L.featureGroup([polylineBG, polyline]);
    if (!optimizedState.is(":checked")) {
        playbackLayerGroup.addTo(MapTrack);
        MapTrack.fitBounds(polyline.getBounds()); // zoom the map to the polyline
    }
}

function getOptimizedRoute(rawArray) {
    var optimizedState = $$('body .playback_page').find('input[name="optimizedState"]');
    var container = $$('body');
    if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
    App.showProgressbar(container);

    var polylineCustomization = {
        'mainBg': {
            color: '#6199CC',
            weight: 6,
            opacity: 1,
        },
        'main': {
            color: '#00B1FC',
            weight: 3,
            opacity: 1,
        },
        'droppedBg': {
            //color: '#b50000',     //red
            color: '#b47605', //orange
            weight: 6,
            opacity: 0.7,
        },
        'dropped': {
            //color: '#fc0405',
            color: '#fd9a08', //orange
            weight: 3,
            opacity: 0.7,
        },
        'boundariesBg': {
            color: '#6199CC',
            weight: 6,
            opacity: 0.4,
        },
        'boundaries': {
            color: '#00B1FC',
            weight: 3,
            opacity: 0.4,
        },
    };
    $.ajax({
        type: "POST",
        url: API_URL.URL_GET_POSITION_ARR2, //"https://osrm.sinopacific.com.ua",
        dataType: "json",
        data: JSON.stringify(rawArray),
        contentType: 'application/json',
        async: true,
        cache: false,
        timeout: 10000,
        success: function(result) {
            var polylineOptBg = new L.Polyline(result.polylines, polylineCustomization.mainBg);
            var polylineOpt = new L.Polyline(result.polylines, polylineCustomization.main);
            playbackLayerGroupOpt = L.featureGroup([polylineOptBg, polylineOpt]);

            if (result.dropped) {
                var polylineOptDroppedBg = new L.Polyline(result.dropped, polylineCustomization.droppedBg);
                var polylineOptDropped = new L.Polyline(result.dropped, polylineCustomization.dropped);
                playbackLayerGroupOpt.addLayer(polylineOptDroppedBg).addLayer(polylineOptDropped);
            }
            if (result.boundaries) {
                var polylineOptBoundariesBg = new L.Polyline(result.boundaries, polylineCustomization.boundariesBg);
                var polylineOptBoundaries = new L.Polyline(result.boundaries, polylineCustomization.boundaries);
                playbackLayerGroupOpt.addLayer(polylineOptBoundariesBg).addLayer(polylineOptBoundaries);
            }
            /*if (layerControl) {
                layerControl.addOverlay(playbackLayerGroupOpt,"Optimized Route");
            } */
            if (optimizedState.is(":checked")) {
                playbackLayerGroupOpt.addTo(MapTrack);
                MapTrack.fitBounds(playbackLayerGroupOpt.getBounds()); // zoom the map to the polyline
            }
            App.hideProgressbar();
        },
        error: function(textStatus) {
            console.log(textStatus);
            if (optimizedState.is(":checked")) {
                App.addNotification({
                    hold: 3000,
                    message: LANGUAGE.PROMPT_MSG021
                });
            }

            var iTIMESTAMP = 3,
                iLAT = 10,
                iLNG = 11,
                iDIR = 13,
                iSPEED = 14,
                iMILEAGE = 15;
            var raw_polyline = [];
            for (var i = 0; i < rawArray.length; i++) {
                raw_polyline.push([rawArray[i][iLAT], rawArray[i][iLNG]]);
            }
            var polylineOptBg = L.polyline(raw_polyline, polylineCustomization.mainBg);
            var polylineOpt = L.polyline(raw_polyline, polylineCustomization.main);
            playbackLayerGroupOpt = L.featureGroup([polylineOptBg, polylineOpt]);
            if (optimizedState.is(":checked")) {
                playbackLayerGroupOpt.addTo(MapTrack);
                MapTrack.fitBounds(playbackLayerGroupOpt.getBounds()); // zoom the map to the polyline
            }
            App.hideProgressbar();
            /*if (layerControl) {
                layerControl.addOverlay(playbackLayerGroup,"Show Optimized");
            }*/
        }
    });
}

function showPlaybackRoute(routeType) { // 1 - raw, 2 - optimized
    if (routeType && MapTrack) {
        switch (routeType) {
            case 1:
                if (playbackLayerGroup) {
                    if (playbackLayerGroupOpt) {
                        MapTrack.removeLayer(playbackLayerGroupOpt);
                    }
                    if (!MapTrack.hasLayer(playbackLayerGroup)) {
                        MapTrack.addLayer(playbackLayerGroup);
                        MapTrack.fitBounds(playbackLayerGroup.getBounds());
                    }
                } else {
                    console.log('There is no such playback route');
                }
                break;

            case 2:
                if (playbackLayerGroupOpt) {
                    if (playbackLayerGroup) {
                        MapTrack.removeLayer(playbackLayerGroup);
                    }
                    if (!MapTrack.hasLayer(playbackLayerGroupOpt)) {
                        MapTrack.addLayer(playbackLayerGroupOpt);
                        MapTrack.fitBounds(playbackLayerGroupOpt.getBounds());
                    }
                } else {
                    console.log('There is no such playback route');
                }
                break;
        }
    }
}
/*function showMapPlayback(){
    var asset = TargetAsset.ASSET_IMEI;   
    var latlng = [POSINFOASSETLIST[asset].posInfo.lat, POSINFOASSETLIST[asset].posInfo.lng];
    MapTrack = Protocol.Helper.createMap({ target: 'map', latLng: latlng, zoom: 15 }); 

    if (!StreetViewService) {
        StreetViewService = new google.maps.StreetViewService();
    }
    
    
    var polylinePoints = [];
         
    $.each( HistoryArray, function(index,value){  
        var point = new L.LatLng(value.lat, value.lng);
        polylinePoints.push(point);  
    });

    //console.log(EventsArray);
    if (EventsArray) {
        var eventPoints = L.markerClusterGroup({'maxClusterRadius':35,});
        var markerIcon = L.icon({
            iconUrl: 'resources/images/info-pin.svg',                       
            iconSize:     [32, 32], // size of the icon                        
            iconAnchor:   [16, 31], // point of the icon which will correspond to marker's location                        
            popupAnchor:  [0, -32] // point from which the popup should open relative to the iconAnchor      
        });
        var markerData = '';
        var point = '';
        var popupAddresses = {};        

        $.each( EventsArray, function(index,value){             
            if (parseFloat(value.lat) !== 0 && parseFloat(value.lng) !== 0) {
                if (value.eventClass == 4 && value.eventType == 0) {  //filtering to display only   1-Alert(alarms) , 2-ACC , 4 - static  events                      
                    value.index = index;   
                    markerData = getMarkerDataTableInfoPin(value);
                    point = L.marker([value.lat, value.lng], {icon: markerIcon});                             
                    point.bindPopup(markerData,{"maxWidth":260})
                        .on('popupopen', function (popup) {
                            if (popupAddresses[index]) {
                                $$('body .position_map').find('[data-popupIdAddress="'+index+'"]').html(popupAddresses[index]);    
                            }else{
                                Protocol.Helper.getAddressByGeocoder(this.getLatLng(),function(address){
                                    $$('body .position_map').find('[data-popupIdAddress="'+index+'"]').html(address);    
                                    popupAddresses[index] = address;
                                }); 
                            }
                        });
                    eventPoints.addLayer(point);                    
                }                   
            }
        });
        MapTrack.addLayer(eventPoints);
    }
    
    var polylineOptionsBG = {
            color: '#6199CC',            
            weight: 6,
            opacity: 1
        };
    var polylineOptions = {
            color: '#00B1FC',            
            weight: 3,
            opacity: 1
        };

    var polylineBG = new L.Polyline(polylinePoints, polylineOptionsBG);
    var polyline = new L.Polyline(polylinePoints, polylineOptions);
            
    MapTrack.addLayer(polylineBG).addLayer(polyline);  
    window.PosMarker[asset].addTo(MapTrack);                      

    // zoom the map to the polyline
    MapTrack.fitBounds(polyline.getBounds());
}*/

function updateGeofenceMarkerGroup(assets, geofenceEdit) {

    if (geofenceMarkerGroup) {
        geofenceMarkerGroup.clearLayers();
        if (MapTrack) {
            MapTrack.removeLayer(geofenceMarkerGroup);
        }
    }
    geofenceMarkerGroup = L.markerClusterGroup({ 'maxClusterRadius': 35, });
    if (assets && assets.length > 0) {
        var point = '';
        var markerData = '';
        $.each(assets, function(key, value) {
            point = '';
            markerData = '';
            if (POSINFOASSETLIST[value] && POSINFOASSETLIST[value].posInfo && POSINFOASSETLIST[value].posInfo.lat !== 0 && POSINFOASSETLIST[value].posInfo.lng !== 0) {
                point = L.marker([POSINFOASSETLIST[value].posInfo.lat, POSINFOASSETLIST[value].posInfo.lng], { icon: Protocol.MarkerIcon[0] });
                markerData = POSINFOASSETLIST[value].Name ? POSINFOASSETLIST[value].Name : POSINFOASSETLIST[value].IMEI;
                point.bindPopup(markerData, { "maxWidth": 260 });
                point.addTo(geofenceMarkerGroup);
            }
        });

        if (geofenceMarkerGroup.getLayers().length > 0) {
            MapTrack.flyToBounds([geofenceMarkerGroup.getBounds(), GeofenceFiguresGroup.getBounds()], { padding: [8, 8] });
        }else{
            MapTrack.flyToBounds([GeofenceFiguresGroup.getBounds()], { padding: [8, 8] });
        }
        geofenceMarkerGroup.addTo(MapTrack);
    }

}

/*function updateGeofenceAddress(latlng) {
    var container = $$('body');
    if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
    App.showProgressbar(container);
    Protocol.Helper.getAddressByGeocoder(latlng, function(address) {
        $$('body [name="geofenceAddress"]').val(address);
        App.hideProgressbar();
    });
}*/

function showMapGeofence(geofence) {
    var latlng = ['-33.869444', '151.208333'];
    //var radius = 300;
    geofenceMarkerGroup = L.markerClusterGroup({ 'maxClusterRadius': 35, });
    // FeatureGroup is to store editable layers
    GeofenceFiguresGroup = new L.FeatureGroup();
    var geofenceFigure = false;
    var assets = [];
    var editFlag = 0;
    var userInfo = getUserinfo();

    if (geofence) {
        editFlag = 1;
        //radius = geofence.Radius;
        latlng = [geofence.Lat, geofence.Lng];
        if (geofence.SelectedAssetList && geofence.SelectedAssetList.length > 0) {
            $.each(geofence.SelectedAssetList, function(key, value) {
                assets.push(value.IMEI);
            });
        }
        if (geofence.GeoType == 1) { //circle
            geofenceFigure = L.circle(latlng, {
                ...Protocol.PolygonCustomization,
                radius: geofence.Radius,
            });
        }else{
            if (geofence.GeoPolygon) {
                var polygonCoordsArr = geofence.GeoPolygon.split('((').pop().split('))')[0].split(',');
                var geojsonArr = [];
                for (var i = polygonCoordsArr.length - 1; i >= 0; i--) {
                    geojsonArr.push(polygonCoordsArr[i].split(' ').map(parseFloat).reverse());
                }
                geofenceFigure = L.polygon(geojsonArr, {
                    ...Protocol.PolygonCustomization
                });
            }
        }
    } else {
        $.each(POSINFOASSETLIST, function(key, value) {
            if (value.posInfo && value.posInfo.lat !== 0 && value.posInfo.lng !== 0) {
                assets.push(key);
            }
        });
    }
    if (geofenceFigure){
        GeofenceFiguresGroup.addLayer(geofenceFigure);
    }

    MapTrack = Protocol.Helper.createMap({ target: 'map', latLng: latlng, zoom: 5 });

    var drawControl = new L.Control.Draw({
        draw: {
            polyline: false,
            marker: false,
            circlemarker: false,
            polygon: {
                shapeOptions: Protocol.PolygonCustomization
            },
            circle: {
                shapeOptions: Protocol.PolygonCustomization
            },
            rectangle: {
                shapeOptions: Protocol.PolygonCustomization
            }
        },
        edit: {
            featureGroup: GeofenceFiguresGroup,
            edit: {
                //moveMarkers: true // centroids, default: false
                selectedPathOptions: {
                    moveMarkers: true
                }
            }
        }
    });

    //check is this for view only page
    if  (!geofence || userInfo.MajorToken == geofence.CustomerCode){
        MapTrack.addControl(drawControl);
    }


    MapTrack.addLayer(GeofenceFiguresGroup);

    updateGeofenceMarkerGroup(assets, editFlag);

    MapTrack.on('draw:created', onMapGeofenceDraw);
}

function onMapGeofenceDraw(e) {
    var type = e.layerType,
        layer = e.layer;

    // Do whatever else you need to. (save to db, add to map etc)
    GeofenceFiguresGroup.clearLayers().addLayer(layer);
}

function loadStatusPage(){
    var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];
    
    if (asset) {
    	var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);
        var speed = Protocol.Helper.getSpeedValue(asset.Unit, asset.posInfo.speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit);
        var direct = asset.posInfo.direct;
        var deirectionCardinal = Protocol.Helper.getDirectionCardinal(direct);
        var time = LANGUAGE.COM_MSG11;
	    if (asset.posInfo.positionTime) {
	        time = asset.posInfo.positionTime.format(window.COM_TIMEFORMAT);
	    }
	    
	    var latlng = {};
	    latlng.lat = asset.posInfo.lat;
	    latlng.lng = asset.posInfo.lng;  
	    var assetStats = {        
	        voltage: false,
	        acc: false,
	        acc2: false,        
	        mileage: false,
	        battery: false,
	        fuel: false,
            power: false,
            engineHours: false,
            stoppedDuration: false,
            geolock: false,
            immob: false,
            
	    };

	    
	    if (assetFeaturesStatus.acc) {
	        assetStats.acc = assetFeaturesStatus.acc.value;
	    }    
	    if (assetFeaturesStatus.acc2) {
	        assetStats.acc2 = assetFeaturesStatus.acc2.value;
	    }    
	    if (assetFeaturesStatus.voltage) {
	        assetStats.voltage = assetFeaturesStatus.voltage.value;
	    }    
	    if (assetFeaturesStatus.mileage) {
	        assetStats.mileage = assetFeaturesStatus.mileage.value;
            assetStats.engineHours = assetFeaturesStatus.engineHours.value;
	    }    
	    if (assetFeaturesStatus.battery) {
	        assetStats.battery = assetFeaturesStatus.battery.value;
	    }    
	    if (assetFeaturesStatus.fuel) {
	        assetStats.fuel = assetFeaturesStatus.fuel.value;
	    }
        if (assetFeaturesStatus.temperature) {
            assetStats.temperature = assetFeaturesStatus.temperature.value;
        }
        if (assetFeaturesStatus.power) {
            assetStats.power = assetFeaturesStatus.power.value;
        }
        if (assetFeaturesStatus.stopped) {
            assetStats.stoppedDuration = assetFeaturesStatus.stopped.duration;
        } 
        if (assetFeaturesStatus.geolock) {
            assetStats.geolock = assetFeaturesStatus.geolock.value;
        } 
        if (assetFeaturesStatus.immob) {
            assetStats.immob = assetFeaturesStatus.immob.value;
        }

	    mainView.router.load({
	        url:'resources/templates/asset.status.html',
	        context:{
	            Name: asset.Name,                           
	            Time: time,
	            Direction: deirectionCardinal+' ('+direct+'&deg;)',            
	            Speed: speed,                    
	            Address: LANGUAGE.COM_MSG08,
	            Voltage: assetStats.voltage,
	            Acc: assetStats.acc,
	            Acc2: assetStats.acc2,
	            Mileage: assetStats.mileage,
	            Battery: assetStats.battery,
	            Fuel: assetStats.fuel,
                Temperature: assetStats.temperature,
                Power: assetStats.power,
                EngineHours: assetStats.engineHours,
                StoppedDuration: assetStats.stoppedDuration,
                ImmobState: assetStats.immob,
                GeolockState: assetStats.geolock,                
                Coords: 'GPS: ' + Protocol.Helper.convertDMS(latlng.lat, latlng.lng),

                ImmobSupported: ((parseInt(POSINFOASSETLIST[TargetAsset.ASSET_IMEI]._FIELD_INT2) & 1) > 0)
	        }
	    }); 

	    if (parseFloat(latlng.lat) !== 0 && parseFloat(latlng.lng) !== 0) {
            Protocol.Helper.getAddressByGeocoder(latlng,function(address){
                $$('body .display_address').html(address);
            });
        }else{
            $$('body .display_address').html(LANGUAGE.COM_MSG11);
        }
    }else{
    	App.alert(LANGUAGE.PROMPT_MSG007);
    }
	    
    
}

function changeGeolockImmobState(params){
    if (params && params.id) {        
        var userInfo = getUserinfo();   
        var url = API_URL.URL_SET_GEOLOCK;
        if (params.name == 'Immobilise') {
            url = API_URL.URL_SET_IMMOBILISATION;               
        }

        var linkState = 'off';

        url = url.format(userInfo.MajorToken,
            userInfo.MinorToken,
            params.id,
            params.state ? 'on' : 'off'
        ); 
        console.log(url);
        App.showPreloader();
        JSON1.request(url, function(result){ 
                console.log(result);                  
                if (result.MajorCode == '000') {
                    console.log(params);
                    setStatusNewState({
                        asset: params.imei,                        
                        forAlarm: params.name,
                        state: params.state
                    });  
                    changeIconColor(params);
                    checkBalance();                     
                                   
                }else if(result.MajorCode == '200' && result.MinorCode == '1003'){ 
                    showNoCreditMessage();
                    params.state = !params.state;
                    changeSwitcherState(params);
                }else if(result.MajorCode == '100' && result.MinorCode == '1003'){                  
                    showCustomMessage({title: LANGUAGE.PROMPT_MSG050, text: LANGUAGE.PROMPT_MSG051}); 
                    params.state = !params.state;
                    changeSwitcherState(params);               
                }else{
                    App.alert(LANGUAGE.COM_MSG36);
                    params.state = !params.state;
                    changeSwitcherState(params);
                }
                                App.hidePreloader();
            },
            function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); }
        );                 
    }
}

function setStatusNewState(params){   
    if (params.state === true) {
        POSINFOASSETLIST[params.asset].StatusNew = POSINFOASSETLIST[params.asset].StatusNew | Protocol.StatusNewEnum[params.forAlarm] ;
    }else{
        POSINFOASSETLIST[params.asset].StatusNew = POSINFOASSETLIST[params.asset].StatusNew & ~Protocol.StatusNewEnum[params.forAlarm] ;
    }
}
function changeIconColor(params){
    if (params.name) {
        var input = $$('.status_page [name='+params.name+']');
        if (input) {
            var parent = input.closest('.item-content');
            var icon = parent.find('.item-media i');
            if (params.state) {
                
                if (params.name == 'Immobilise') {
                    $$(icon).removeClass('state-3 color-gray').addClass('state-3');
                    $('#immob-state'+params.imei).removeClass('state-3 state-0').addClass('state-3');
                }else{
                    $$(icon).removeClass('state-1 color-gray').addClass('state-1');
                    $('#geolock-state'+params.imei).removeClass('state-1 state-0').addClass('state-1');
                }
            }else{                
                if (params.name == 'Immobilise') {
                    $$(icon).removeClass('state-3 color-gray').addClass('color-gray');
                    $('#immob-state'+params.imei).removeClass('state-3 state-0').addClass('state-0');
                }else{
                    $$(icon).removeClass('state-1 color-gray').addClass('color-gray');
                    $('#geolock-state'+params.imei).removeClass('state-1 state-0').addClass('state-0');
                }
            }
        }
    }
}
function changeSwitcherState(params){   
    if (params.name) {
        var input = $$('.status_page [name='+params.name+']');       
        if (input) {
            input.prop('checked', params.state);                  
        }
    }
}
function showNoCreditMessage(){
    var modalTex = '<div class="color-red custom-modal-title">'+ LANGUAGE.PROMPT_MSG032 +'</div>' +
                    '<div class="custom-modal-text">'+ LANGUAGE.PROMPT_MSG029 +'</div>';                            
    App.modal({
           title: '<div class="custom-modal-logo-wrapper"><img class="custom-modal-logo" src="resources/images/logo.png" alt=""/></div>',
            text: modalTex,                                
         buttons: [
            {
                text: LANGUAGE.COM_MSG35
            },
            {
                text: LANGUAGE.COM_MSG34,
                //bold: true,
                onClick: function () {
                    loadRechargeCredit();  
                }
            },
        ]
    });             
}

function showAskForReviewMessage() {

    var appId = '';
    if (window.device) {
        var platform = device.platform.toLowerCase();
        switch (platform) {
            case "ios":
                appId = AppDetails.appleId;
                break;
            case "android":
                appId = AppDetails.appId;
                break;
        }
    }


    var modal = App.modal({
        title: '<div class="custom-modal-logo-wrapper"><img class="custom-modal-logo" src="resources/images/logo.png" alt=""/></div>',
        text: '<div class="custom-modal-text">' + LANGUAGE.PROMPT_MSG028 + '</div>',
        afterText: '<div class="list-block no-hairlines modal-checkbox">' +
            '<ul>' +
            '<li>' +
            '<label class="label-checkbox item-content">' +
            '<input type="checkbox" name="checkbox-not-show-modal-review" value="">' +
            '<div class="item-media">' +
            '<i class="icon icon-form-checkbox"></i>' +
            '</div>' +
            '<div class="item-inner">' +
            '<div class="item-title">' + LANGUAGE.COM_MSG40 + '</div>' +
            '</div>' +
            '</label>' +
            '</li>' +
            '</ul>' +
            '</div>',
        buttons: [{
            text: LANGUAGE.COM_MSG39,
            onClick: function(parent) {
                var checkboxState = parent.find('input[name="checkbox-not-show-modal-review"]').is(":checked");
                if (checkboxState) {
                    localStorage.ModalReview = checkboxState;
                }
            }
        },
            {
                text: LANGUAGE.COM_MSG38,
                bold: true,
                onClick: function(parent) {
                    var checkboxState = parent.find('input[name="checkbox-not-show-modal-review"]').is(":checked");
                    if (checkboxState) {
                        localStorage.ModalReview = checkboxState;
                    }

                    if (LaunchReview) {
                        LaunchReview.launch(function() {
                            console.log("Successfully launched store app");
                        }, function(err) {
                            console.log("Error launching store app: " + err);
                        }, appId);
                    }
                }
            },
        ]
    });
}

function showCustomMessage(params){
    var modalTex = '';
    if (params.title) {
        modalTex += '<div class="color-red custom-modal-title">'+ params.title +'</div>';
    }
    if (params.text) {
        modalTex += '<div class="custom-modal-text">'+ params.text +'</div>';  
    }    
                                             
    App.modal({
           title: '<div class="custom-modal-logo-wrapper"><img class="custom-modal-logo" src="resources/images/logo.png" alt=""/></div>',
            text: modalTex,                                
         buttons: [
            {
                text: LANGUAGE.COM_MSG38
            }            
        ]
    });    
}

/*
function loadAlarmPage(){

    var assetList = getAssetList();
    var assetAlarmVal = assetList[TargetAsset.ASSET_IMEI].AlarmOptions;

    var alarms = {
        accOff: {
            state: true,
            val: 65536,
        },
        accOn: {
            state: true,
            val: 32768,
        },
        customAlarm: {
            state: true,
            val: 131072,
        },
        custom2LowAlarm: {
            state: true,
            val: 1048576,
        },
        geolock: {
            state: true,
            val: 1024,
        },
        geofenceIn: {
            state: true,
            val: 8,
        },
        geofenceOut: {
            state: true,
            val: 16,
        },
        illegalIgnition: {
            state: true,
            val: 128,
        },
        lowBattery: {
            state: true,
            val: 512,
        },
        mainBatteryFail: {
            state: true,
            val: 4,
        },
        sosAlarm: {
            state: true,
            val: 2,
        },
        speeding: {
            state: true,
            val: 32,
        },
        tilt: {
            state: true,
            val: 256,
        },
        harshAcc: {
            state: true,
            val: 33554432,
        },
        harshBrk: {
            state: true,
            val: 2097152,
        },
        alarm: {
            state: true,
            //val: 0,
        },
    };


    if (assetAlarmVal) {
        $.each( alarms, function ( key, value ) {
            if (assetAlarmVal & value.val) {
                alarms[key].state = false;
            }
        });
        if (assetAlarmVal == 36931518) {
            alarms.alarm.state = false;
        }

    }



    mainView.router.load({
        url:'resources/templates/asset.alarm.html',
        context:{
            Name: POSINFOASSETLIST[TargetAsset.ASSET_IMEI].Name,
            alarm: alarms.alarm.state,
            accOff: alarms.accOff.state,
            accOn: alarms.accOn.state,
            customAlarm: alarms.customAlarm.state,
            geolock: alarms.geolock.state,
            //custom2Alarm: alarms.custom2Alarm.state,
            custom2LowAlarm: alarms.custom2LowAlarm.state,
            geofenceIn: alarms.geofenceIn.state,
            geofenceOut: alarms.geofenceOut.state,
            illegalIgnition: alarms.illegalIgnition.state,
            //input1Alarm: alarms.input1Alarm.state,
            //input1LowAlarm: alarms.input1LowAlarm.state,
            lowBattery: alarms.lowBattery.state,
            mainBatteryFail: alarms.mainBatteryFail.state,
            sosAlarm: alarms.sosAlarm.state,
            speeding: alarms.speeding.state,
            tilt: alarms.tilt.state,
            harshAcc: alarms.harshAcc.state,
            harshBrk: alarms.harshBrk.state,
        }
    });
}
*/

function getAlertConfig() {
    var userInfo = getUserinfo();
    var data = {
        MajorToken: userInfo.MajorToken,
        MinorToken: userInfo.MinorToken,
        IMEI: TargetAsset.ASSET_IMEI
    };

    App.showPreloader();
    $.ajax({
        type: "POST",
        url: API_URL.URL_GET_ALERT_CONFIG,
        data: data,
        async: true,
        cache: false,
        crossDomain: true,
        success: function(result) {
            App.hidePreloader();
            console.log(result);
            if (result.MajorCode == '000') {
                //if (!result.Data) {
                loadAlarmPage(result.Data);
                //}

            } else {
                //App.alert(LANGUAGE.PROMPT_MSG013);
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            App.hidePreloader();
            App.alert(LANGUAGE.COM_MSG02);
        }
    });
}

function loadAlarmPage(params) {

    var assetList = getAssetList();
    var assetAlarmVal = assetList[TargetAsset.ASSET_IMEI].AlarmOptions;

    var alarms = {
        accOff: {
            state: true,
            val: 65536,
        },
        accOn: {
            state: true,
            val: 32768,
        },
        customAlarm: {
            state: true,
            val: 131072,
        },
        custom2LowAlarm: {
            state: true,
            val: 1048576,
        },
        geolock: {
            state: true,
            val: 1024,
        },
        geofenceIn: {
            state: true,
            val: 8,
        },
        geofenceOut: {
            state: true,
            val: 16,
        },
        illegalIgnition: {
            state: true,
            val: 128,
        },
        lowBattery: {
            state: true,
            val: 512,
        },
        mainBatteryFail: {
            state: true,
            val: 4,
        },
        sosAlarm: {
            state: true,
            val: 2,
        },
        speeding: {
            state: true,
            val: 32,
        },
        tilt: {
            state: true,
            val: 256,
        },
        harshAcc: {
            state: true,
            val: 33554432,
        },
        harshBrk: {
            state: true,
            val: 2097152,
        },
        offline: {
            state: true,
            val: 67108864,
        },
        alarm: {
            state: true,
            //val: 0,
        },
    };

    var daysOfWeekArray = [{
        val: 0,
        name: LANGUAGE.GEOFENCE_MSG_20,
        selected: false,
    },
        {
            val: 1,
            name: LANGUAGE.GEOFENCE_MSG_21,
            selected: false,
        },
        {
            val: 2,
            name: LANGUAGE.GEOFENCE_MSG_22,
            selected: false,
        },
        {
            val: 3,
            name: LANGUAGE.GEOFENCE_MSG_23,
            selected: false,
        },
        {
            val: 4,
            name: LANGUAGE.GEOFENCE_MSG_24,
            selected: false,
        },
        {
            val: 5,
            name: LANGUAGE.GEOFENCE_MSG_25,
            selected: false,
        },
        {
            val: 6,
            name: LANGUAGE.GEOFENCE_MSG_26,
            selected: false,
        },
    ];

    var BeginTime = '07:00';
    var EndTime = '18:00';
    var IsIgnore = 0;



    if (!params) {
        if (assetAlarmVal) {
            $.each(alarms, function(key, value) {
                if (assetAlarmVal & value.val) {
                    alarms[key].state = false;
                }
            });
            if (assetAlarmVal == 36931518) {
                alarms.alarm.state = false;
            }
        }
    } else {

        $.each(alarms, function(key, value) {
            if (params.AlertTypes & value.val) {
                alarms[key].state = false;
            }
        });
        if (params.AlertTypes == 36931518) {
            alarms.alarm.state = false;
        }

        if (params.Weeks) {
            var selectedDays = params.Weeks.split(',');
            if (selectedDays && selectedDays.length) {
                $.each(selectedDays, function(index, value) {
                    var dayIndex = daysOfWeekArray.findIndex(x => x.val === parseInt(value, 10));
                    if (dayIndex != -1) {
                        daysOfWeekArray[dayIndex].selected = true;
                    }

                });
            }
        }
        if (params.BeginTime) {
            BeginTime = moment(params.BeginTime, 'HH:mm').add(UTCOFFSET, 'minutes').format('HH:mm');
        }
        if (params.EndTime) {
            EndTime = moment(params.EndTime, 'HH:mm').add(UTCOFFSET, 'minutes').format('HH:mm');
        }
        if (params.IsIgnore) {
            IsIgnore = params.IsIgnore;
        }

    }

    var speedingMode = 1;
    var overspeedRadio1 = true;
    var overspeedRadio2 = false;
    if (params.SpeedingMode && params.SpeedingMode == 2) {
        overspeedRadio1 = !overspeedRadio1;
        overspeedRadio2 = !overspeedRadio2;
    }

    var offlineOptions = {
        '24': false,
        '48': false,
        '72': false,
    };
    if (params.OfflineHours) {
        var selectedOfflineOptions = params.OfflineHours.split(',');
        for (var i = selectedOfflineOptions.length - 1; i >= 0; i--) {
            offlineOptions[selectedOfflineOptions[i]] = true;
        }
    }

    mainView.router.load({
        url: 'resources/templates/asset.alarm.html',
        context: {
            Name: POSINFOASSETLIST[TargetAsset.ASSET_IMEI].Name,
            alarm: alarms.alarm.state,
            accOff: alarms.accOff.state,
            accOn: alarms.accOn.state,
            customAlarm: alarms.customAlarm.state,
            geolock: alarms.geolock.state,
            //custom2Alarm: alarms.custom2Alarm.state,
            custom2LowAlarm: alarms.custom2LowAlarm.state,
            geofenceIn: alarms.geofenceIn.state,
            geofenceOut: alarms.geofenceOut.state,
            illegalIgnition: alarms.illegalIgnition.state,
            //input1Alarm: alarms.input1Alarm.state,
            //input1LowAlarm: alarms.input1LowAlarm.state,
            lowBattery: alarms.lowBattery.state,
            mainBatteryFail: alarms.mainBatteryFail.state,
            sosAlarm: alarms.sosAlarm.state,
            speeding: alarms.speeding.state,
            tilt: alarms.tilt.state,
            harshAcc: alarms.harshAcc.state,
            harshBrk: alarms.harshBrk.state,

            DaysOfWeek: daysOfWeekArray,
            BeginTime: BeginTime,
            EndTime: EndTime,
            IgnoreBetween: IsIgnore,

            SpeedingMode: speedingMode,
            OverspeedRadio1: overspeedRadio1,
            OverspeedRadio2: overspeedRadio2,
            MaxSpeed: params.MaxSpeed ? params.MaxSpeed : 80,

            offline: alarms.offline.state,
            offline24: offlineOptions['24'],
            offline48: offlineOptions['48'],
            offline72: offlineOptions['72'],
        }
    });
}


function loadPlaybackPage(){
    var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];
    checkMapExisting();
    mainView.router.load({
        url:'resources/templates/asset.playback.html',
        context:{
            Name: asset.Name, 
        }
    });
}
function checkMapExisting(){
    if ($$('#map')) {
        $$('#map').remove();
        MapTrack = null;
    }   
}

function getMarkerDataTable(asset, positionDetails){
    //console.log(asset);
    var markerData = '';
    var customAddress = LANGUAGE.COM_MSG08;
    var deirectionCardinal = '';
    if (asset && positionDetails) {
        customAddress = !positionDetails.customAddress ? LANGUAGE.COM_MSG08 : positionDetails.customAddress;
        deirectionCardinal = Protocol.Helper.getDirectionCardinal(positionDetails.direct);
        markerData += '<table cellpadding="0" cellspacing="0" border="0" class="marker-data-table">';
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG06+'</td>';
        markerData +=       '<td class="marker-data-value">'+positionDetails.name+'</td>';
        markerData +=   '</tr>';
            if (positionDetails.status) {
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG07+'</td>';
        markerData +=       '<td class="marker-data-value">'+positionDetails.status+'</td>';
        markerData +=   '</tr>';         
            }     
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG13+'</td>';
        markerData +=       '<td class="marker-data-value">'+positionDetails.time+'</td>';
        markerData +=   '</tr>';
            if (positionDetails.mileage) {
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG03+'</td>';
        markerData +=       '<td class="marker-data-value">'+positionDetails.mileage+'</td>';
        markerData +=   '</tr>';         
            }        
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG02+'</td>';
        markerData +=       '<td class="marker-data-value">'+positionDetails.speed+'</td>';
        markerData +=   '</tr>';                            
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG01+'</td>';
        markerData +=       '<td class="marker-data-value">'+deirectionCardinal+' ('+positionDetails.direct+'&deg;)</td>';
        markerData +=   '</tr>';                           
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">GPS</td>';
        markerData +=       '<td class="marker-data-value ">'+ Protocol.Helper.convertDMS(positionDetails.latlng.lat, positionDetails.latlng.lng) +'</td>';
        markerData +=   '</tr>';
        markerData +=   '<tr>';
        markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG11+'</td>';
        markerData +=       '<td class="marker-data-value ">'+ customAddress + '</td>';
        markerData +=   '</tr>';
        markerData += '</table>';
    }else if (asset ) {
        var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);        
        if (assetFeaturesStatus && assetFeaturesStatus.stats) {
            var speed = 0;
            var mileage = '-';
            deirectionCardinal = Protocol.Helper.getDirectionCardinal(asset.posInfo.direct);
            var positionType = Protocol.Helper.getPositionType(parseInt(asset.posInfo.positionType));
            if (typeof asset.Unit !== "undefined" && typeof asset.posInfo.speed !== "undefined") {
                speed = Protocol.Helper.getSpeedValue(asset.Unit, asset.posInfo.speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit);
            }        
            if (typeof asset.Unit !== "undefined" && typeof asset.posInfo.mileage !== "undefined" && asset.posInfo.mileage != '-') {
                mileage = (Protocol.Helper.getMileageValue(asset.Unit, asset.posInfo.mileage) + parseInt(asset.InitMileage) + parseInt(asset._FIELD_FLOAT7)) + '&nbsp;' + Protocol.Helper.getMileageUnit(asset.Unit);
            }
            customAddress = !asset.posInfo.customAddress ? LANGUAGE.COM_MSG08 : asset.posInfo.customAddress;

            markerData += '<table cellpadding="0" cellspacing="0" border="0" class="marker-data-table">';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG06+'</td>';
            markerData +=       '<td class="marker-data-value">'+asset.Name+'</td>';
            markerData +=   '</tr>';          
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG07+'</td>';
            markerData +=       '<td class="marker-data-value">'+toTitleCase(assetFeaturesStatus.status.value)+'</td>';
            markerData +=   '</tr>';            
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG13+'</td>';
            markerData +=       '<td class="marker-data-value">'+asset.posInfo.positionTime.format(window.COM_TIMEFORMAT)+'</td>';
            markerData +=   '</tr>';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG03+'</td>';
            markerData +=       '<td class="marker-data-value">'+mileage+'</td>';
            markerData +=   '</tr>';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG02+'</td>';
            markerData +=       '<td class="marker-data-value">'+speed+'</td>';
            markerData +=   '</tr>'; 
                            if (assetFeaturesStatus.acc) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_STATUS_MSG13+'</td>';
            markerData +=       '<td class="marker-data-value">'+assetFeaturesStatus.acc.value+'</td>';
            markerData +=   '</tr>';
                            }            
                            if (assetFeaturesStatus.battery) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG08+'</td>';
            markerData +=       '<td class="marker-data-value">'+assetFeaturesStatus.battery.value+'</td>';
            markerData +=   '</tr>';
                            }
                            if (assetFeaturesStatus.power) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_STATUS_MSG21+'</td>';
            markerData +=       '<td class="marker-data-value">'+assetFeaturesStatus.power.value+'</td>';
            markerData +=   '</tr>';
                            }
                            if (assetFeaturesStatus.fuel) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG10+'</td>';
            markerData +=       '<td class="marker-data-value">'+assetFeaturesStatus.fuel.value+'</td>';
            markerData +=   '</tr>';
                            }                           
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG01+'</td>';
            markerData +=       '<td class="marker-data-value">'+deirectionCardinal+' ('+asset.posInfo.direct+'&deg;)</td>';
            markerData +=   '</tr>';   
                            if (positionType) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_PLAYBACK_MSG27+'</td>';
            markerData +=       '<td class="marker-data-value ">'+positionType+'</td>';
            markerData +=   '</tr>';
                            }                        
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">GPS</td>';
            markerData +=       '<td class="marker-data-value ">'+ Protocol.Helper.convertDMS(asset.posInfo.lat, asset.posInfo.lng) +'</td>';
            markerData +=   '</tr>';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG11+'</td>';
            markerData +=       '<td class="marker-data-value ">'+customAddress+'</td>';
            markerData +=   '</tr>';
            markerData += '</table>';
        }
    }

    return markerData;
        
}

function getMarkerDataTablePB(asset, point){
    var markerData = '';
    if (asset) {
        var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);
        if (assetFeaturesStatus && assetFeaturesStatus.stats) {
            var speed = 0;
            var mileage = '-';
            var direct = point.direct;
            var deirectionCardinal = Protocol.Helper.getDirectionCardinal(direct);
            if (typeof asset.Unit !== "undefined" && typeof asset.posInfo.speed !== "undefined") {
                speed = Protocol.Helper.getSpeedValue(asset.Unit, point.speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit);
            }        
            if (typeof asset.Unit !== "undefined" && typeof asset.posInfo.mileage !== "undefined" && asset.posInfo.mileage != '-') {
                mileage = (Protocol.Helper.getMileageValue(asset.Unit, point.mileage) + parseInt(asset.InitMileage) + parseInt(asset._FIELD_FLOAT7)) + '&nbsp;' + Protocol.Helper.getMileageUnit(asset.Unit);
            }
            
            var time = moment(point.positionTime,'X').format(window.COM_TIMEFORMAT); 
           
            var customAddress = !point.customAddress ? LANGUAGE.COM_MSG08 : point.customAddress;         
            

            markerData += '<table cellpadding="0" cellspacing="0" border="0" class="marker-data-table">';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG06+'</td>';
            markerData +=       '<td class="marker-data-value">'+asset.Name+'</td>';
            markerData +=   '</tr>';
           /* markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG07+'</td>';
            markerData +=       '<td class="marker-data-value">'+toTitleCase(assetFeaturesStatus.status.value)+'</td>';
            markerData +=   '</tr>';            */
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG13+'</td>';
            markerData +=       '<td class="marker-data-value">'+time+'</td>';
            markerData +=   '</tr>';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG03+'</td>';
            markerData +=       '<td class="marker-data-value">'+mileage+'</td>';
            markerData +=   '</tr>';
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG02+'</td>';
            markerData +=       '<td class="marker-data-value">'+speed+'</td>';
            markerData +=   '</tr>';
                            /*if (assetFeaturesStatus.battery) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG08+'</td>';
            markerData +=       '<td class="marker-data-value">'+assetFeaturesStatus.battery.value+'</td>';
            markerData +=   '</tr>';
                            }
                            if (assetFeaturesStatus.fuel) {
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG10+'</td>';
            markerData +=       '<td class="marker-data-value">'+assetFeaturesStatus.fuel.value+'</td>';
            markerData +=   '</tr>';
                            }*/
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG01+'</td>';
            markerData +=       '<td class="marker-data-value">'+deirectionCardinal+' ('+direct+'&deg;)</td>';
            markerData +=   '</tr>';
                                    
            markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG11+'</td>';
            markerData +=       '<td class="marker-data-value marker-address">'+customAddress+'</td>';
            markerData +=   '</tr>';
                            
            markerData += '</table>';
        }
    }
    return markerData;        
}

function getMarkerDataTableInfoPin(point){
    var markerData = '';
    
    var beginTime = moment(point.beginTime).format(window.COM_TIMEFORMAT);  
    beginTime = moment.utc(beginTime).toDate();
    beginTime = moment(beginTime).local().format(window.COM_TIMEFORMAT);
    var endTime = moment(point.endTime).format(window.COM_TIMEFORMAT); 
    endTime = moment.utc(endTime).toDate();
    endTime = moment(endTime).local().format(window.COM_TIMEFORMAT);
    var dateDifference = Protocol.Helper.getDifferenceBTtwoDates(beginTime,endTime);
    
    var duration = moment.duration(dateDifference, "milliseconds").format('d[d] h[h] m[m] s[s]');

    markerData += '<table cellpadding="0" cellspacing="0" border="0" class="marker-data-table">';
    switch (point.eventClass){
        case 1:         
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">Alarm</td>';
            $.each(Protocol.PositionAlerts,function(key,val){
                if (val == point.eventType) {
                    markerData +=       '<td class="marker-data-value">'+key+'</td>';
                }
            });         
            markerData +=   '</tr>';   
            break;

        case 2:     // ACC
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">Ignition</td>';
                if (point.eventType === 0) {
            markerData +=       '<td class="marker-data-value">OFF</td>';
                }else{
            markerData +=       '<td class="marker-data-value">ON</td>';
                }           
            markerData +=   '</tr>';   
            break;

        case 4:     // ACTIVE
            markerData +=   '<tr>';
            markerData +=       '<td class="marker-data-caption">Activity</td>';
                if (point.eventType === 0) {
            markerData +=       '<td class="marker-data-value">Stopped</td>';
                }else{
            markerData +=       '<td class="marker-data-value">Move</td>';
                }           
            markerData +=   '</tr>';   
            break;
    }
    
    markerData +=   '<tr>';
    markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_PLAYBACK_MSG05+'</td>';
    markerData +=       '<td class="marker-data-value">'+beginTime+'</td>';
    markerData +=   '</tr>';          
    markerData +=   '<tr>';
    markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_PLAYBACK_MSG07+'</td>';
    markerData +=       '<td class="marker-data-value">'+endTime+'</td>';
    markerData +=   '</tr>';
    markerData +=   '<tr>';
    markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_PLAYBACK_MSG24+'</td>';
    markerData +=       '<td class="marker-data-value">'+duration+'</td>';
    markerData +=   '</tr>';  
    markerData +=   '<tr>';
    markerData +=       '<td class="marker-data-caption">'+LANGUAGE.ASSET_TRACK_MSG11+'</td>';
    markerData +=       '<td class="marker-data-value marker-address" data-popupIdAddress="'+point.index+'">'+LANGUAGE.COM_MSG08+'</td>';
    markerData +=   '</tr>';
  
    markerData += '</table>';
    
    return markerData;      
}



function loadTrackPage(params){
    //alert(JSON.stringify(params));
    var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];
        
    var details = {
        direct : '',
        direction: '',
        speed : 0,
        mileage : '',
        templateUrl : 'resources/templates/asset.track.html',
        latlng : {},
        name : '',
        time : '',
        //coords: '',
        customAddress: '',
        status: '',
           

    };
//{"title":"Acc off","type":65536,"imei":"0352544073967920","name":"Landcruiser Perth","lat":-32.032898333333335,"lng":115.86817722222216,"speed":0,"direct":0,"time":"2018-04-13 10:16:51"}
    if ((params && parseFloat(params.lat) !== 0 && parseFloat(params.lng) !== 0) || (parseFloat(asset.posInfo.lat) !== 0 && parseFloat(asset.posInfo.lng) !== 0) ){ 
        var markerData = '';    
        if (params) {
            if (asset && typeof asset.Unit !== "undefined" && typeof params.speed !== "undefined" ) {                 
                details.speed = Protocol.Helper.getSpeedValue(asset.Unit, params.speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit);
            }
           
            details.templateUrl = 'resources/templates/asset.location.html';            
            details.latlng.lat = params.lat;
            details.latlng.lng = params.lng;
            details.name = params.name;
            details.time = params.time;
            details.direct = parseInt(params.direct); 
            markerData = getMarkerDataTable(asset, details);          
            
        }else{  
            var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);
           
            details.latlng.lat = asset.posInfo.lat;
            details.latlng.lng = asset.posInfo.lng;
            details.name = asset.Name;
           
            markerData = getMarkerDataTable(asset); 
           
        }
        
        //details.direction = Protocol.Helper.getDirectionCardinal(details.direct)+' ('+details.direct+'&deg;)';
        //details.coords = 'GPS: ' + Protocol.Helper.convertDMS(details.latlng.lat, details.latlng.lng);

        //var markerData = getMarkerDataTable(asset, details);
        window.PosMarker[TargetAsset.ASSET_IMEI] = L.marker([details.latlng.lat, details.latlng.lng], {icon: Protocol.MarkerIcon[0]}); 
        window.PosMarker[TargetAsset.ASSET_IMEI].setLatLng([details.latlng.lat, details.latlng.lng]); 
        window.PosMarker[TargetAsset.ASSET_IMEI].bindPopup(markerData,{"maxWidth":260});

        checkMapExisting();
        
        //console.log(details);
        mainView.router.load({
            url:details.templateUrl,
            context:{
                Name: details.name,                           
                //Time: details.time,
                //Direction: details.direction, 
                //Mileage: details.mileage,
                //Speed: details.speed,                    
                //Address: LANGUAGE.COM_MSG08,                
                Lat: details.latlng.lat,
                Lng: details.latlng.lng,
                //Coords: details.coords,
                      
            }
        });        

        Protocol.Helper.getAddressByGeocoder(details.latlng,function(address){
            $$('body .display_address').html(address);
            details.customAddress = address; 
            asset.posInfo.customAddress = address; 
            var newMarkerData = '';
            if (params ) {
                newMarkerData = getMarkerDataTable(asset, details);
            }else{
                newMarkerData = getMarkerDataTable(asset);
            }            
            window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(newMarkerData);
        });
        
    }else{
        App.alert(LANGUAGE.PROMPT_MSG004);
    } 
        
}

function globalsTodafault(){
    clearInterval(trackTimer);    
    trackTimer = false;

    clearInterval(playbackTimer);
    playbackTimer = false;
    HistoryArray = [];
    EventsArray = [];
}

function updateAssetData(parameters){    
    var userInfo = getUserinfo();  
    //var url = API_URL.URL_GET_ALL_POSITIONS.format(userInfo.MinorToken); 
    var url = API_URL.URL_GET_POSITION.format(userInfo.MinorToken,TargetAsset.ASSET_ID); 

    var container = $$('body');
    if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
    App.showProgressbar(container);

    JSON1.request(url, function(result){ 
            //console.log(result);                     
            if (result.MajorCode == '000') {
                if (result.Data) {

                    var posData = result.Data.Pos;
                    if (posData) {
                        var imei = posData[1];
                        var posTime = posData[5];
                        if (POSINFOASSETLIST[imei] && posTime > POSINFOASSETLIST[imei].posInfo.positionTime._i) {
                            POSINFOASSETLIST[imei].initPosInfo(posData); 
                        } 
                    }
                        
                    /*var data = result.Data;                     
                    var posData = ''; 
                    var imei = ''; 
                    $.each( data, function( key, value ) {  
                        posData = value;
                        imei = posData[1];   
                        if (POSINFOASSETLIST[imei] && posData[5] > POSINFOASSETLIST[imei].posInfo.positionTime._i) {
                            POSINFOASSETLIST[imei].initPosInfo(posData); 
                        } 
                    }); */    
                    
                    setTimeout(function(){
                        updateMarkerPositionTrack(parameters);
                        App.hideProgressbar();
                    },500); 
                    updateAssetsListStats();  
                }     
                         
            }else{
                App.hideProgressbar();
            }
        },
        function(){ 
            App.hideProgressbar();
        }
    ); 
}

function updateAssetDataByGPRS(){    
    var userInfo = getUserinfo();  
    
    var url = API_URL.URL_GET_POSITION2.format(userInfo.MinorToken,TargetAsset.ASSET_ID); 

    var container = $$('body');
    if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
    App.showProgressbar(container);

    JSON1.request(url, function(result){ 
            //console.log(result);                     
            if (result.MajorCode == '000' ) {               
                if (result.Data) {                    
                    if (typeof(result.Data) == 'string') {
                        result.Data = JSON.parse(result.Data);
                    }
                    //console.log(result.Data);
                    //POSINFOASSETLIST[result.Data[1]].initPosInfo(result.Data); 
                    if (POSINFOASSETLIST[result.Data[1]] && result.Data[5] > POSINFOASSETLIST[result.Data[1]].posInfo.positionTime._i) {
                        POSINFOASSETLIST[result.Data[1]].initPosInfo(result.Data); 

                        setTimeout(updateMarkerPositionTrack,500); 
                        updateAssetsListStats();
                    } 
                }                                           
            }
            App.hideProgressbar();
        },
        function(){ 
            App.hideProgressbar();
        }
    ); 
}

function updateMarkerPositionTrack(data){
        var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];
        
        if (asset) {
            window.PosMarker[TargetAsset.ASSET_IMEI].setLatLng([asset.posInfo.lat, asset.posInfo.lng]);

            if (data && data.posTime) {
                data.posTime.html(asset.posInfo.positionTime.format(window.COM_TIMEFORMAT));           
            }
            if (data && data.posMileage) {
                data.posMileage.html((Protocol.Helper.getMileageValue(asset.Unit, asset.posInfo.mileage) + parseInt(asset.InitMileage) + parseInt(asset._FIELD_FLOAT7)) + '&nbsp;' + Protocol.Helper.getMileageUnit(asset.Unit)); 
            }
            if (data && data.posSpeed) {
                data.posSpeed.html(Protocol.Helper.getSpeedValue(asset.Unit, asset.posInfo.speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit));
            }             
            

            var latlng = {};
            latlng.lat = asset.posInfo.lat;
            latlng.lng = asset.posInfo.lng;

            /*if (data && data.routeButton) {
                data.routeButton.attr('href',API_ROUTE+latlng.lat+','+latlng.lng);
            }*/

            if (data && data.routeButton) {                
                data.routeButton.data('lat',latlng.lat);
                data.routeButton.data('lng',latlng.lng);
            }

            if (data && data.panoButton) {
                data.panoButton.data('lat',latlng.lat);
                data.panoButton.data('lng',latlng.lng);
            }
           
            var newMarkerData = getMarkerDataTable(asset);            
            window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(newMarkerData);
            var popup = window.PosMarker[TargetAsset.ASSET_IMEI].getPopup();
            if (popup.isOpen()) { 
                popup.update();
            }else{
                MapTrack.setView([asset.posInfo.lat, asset.posInfo.lng]);
            }
            
           
            Protocol.Helper.getAddressByGeocoder(latlng,function(address){
                if (data && data.posTime) {
                    data.posAddress.html(address);
                }                

                asset.posInfo.customAddress = address;            
                newMarkerData = getMarkerDataTable(asset);
                window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(newMarkerData);
                if (popup.isOpen()) { 
                    popup.update();
                }else{
                    MapTrack.setView([asset.posInfo.lat, asset.posInfo.lng]);
                }
                
            });
        }
            
}

function getHisPosArray(from, to){
    var MinorToken = getUserinfo().MinorToken;

    var url = API_URL.URL_GET_POSITION_ARR.format(MinorToken, 
            TargetAsset.ASSET_ID,
            from,
            to);      
    App.showPreloader();
   
    JSON1.request(url, function(result) {           
                           console.log(result);
            if(result.MajorCode == '000') {
                var hisArray = result.Data.HisArry;  
                if (hisArray.length === 0) {
                    App.addNotification({
                        hold: 5000,
                        message: LANGUAGE.COM_MSG05                                   
                    });
                }else{
                    //console.log(hisArray);
                    if (result.Data.HisEvents) {
                        setEventsArray(result.Data.HisEvents); 
                    }
                    setHistoryArray(hisArray);

                    var rawArray = [];
                    $.each(hisArray, function(index, value) {
                        rawArray.push([
                            null,
                            null,
                            null,
                            new Date(value[0] * 1000),
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            value[1], //lat
                            value[2], // lng
                            null,
                            value[3], //direct
                            value[4], //speed
                            value[6] //mileage
                        ]);
                    });

                    getOptimizedRoute(rawArray);

                    var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];
                    var firstPoint = hisArray[0]; 
                    var lastPoint = hisArray[hisArray.length - 1];   
                    //console.log(lastPoint);          
                    var latlng = {};
                    latlng.lat = firstPoint[1];
                    latlng.lng = firstPoint[2];
                    
                    var speed = Protocol.Helper.getSpeedValue(asset.Unit, firstPoint[4]) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit);
                    //var direct = firstPoint[3];
                    var mileage = (Protocol.Helper.getMileageValue(asset.Unit, firstPoint[6]) + parseInt(asset.InitMileage) + parseInt(asset._FIELD_FLOAT7)) + '&nbsp;' + Protocol.Helper.getMileageUnit(asset.Unit);
                    var time = moment(firstPoint[0],'X').format(window.COM_TIMEFORMAT);                    
                    var timeFinish = moment(lastPoint[0],'X').format(window.COM_TIMEFORMAT);       

                    var point = {};
                    var firstPointIndex = 0;
                    point.positionTime = firstPoint[firstPointIndex++];
                    point.lat = firstPoint[firstPointIndex++];
                    point.lng = firstPoint[firstPointIndex++];
                    point.direct = firstPoint[firstPointIndex++];
                    point.speed = firstPoint[firstPointIndex++];
                    point.timeSpan = firstPoint[firstPointIndex++];
                    point.mileage = firstPoint[firstPointIndex++];
                    point.alerts = firstPoint[firstPointIndex++];
                    point.status = firstPoint[firstPointIndex++];                    
                    
                    var markerData = getMarkerDataTablePB(asset, point);
                    window.PosMarker[TargetAsset.ASSET_IMEI] = L.marker([latlng.lat, latlng.lng], {icon: Protocol.MarkerIcon[0]}); 
                    window.PosMarker[TargetAsset.ASSET_IMEI].setLatLng([latlng.lat, latlng.lng]);
                    window.PosMarker[TargetAsset.ASSET_IMEI].bindPopup(markerData,{"autoPan":false,"maxWidth":260});
                    POSINFOASSETLIST[TargetAsset.ASSET_IMEI].posInfo.lat = latlng.lat;
                    POSINFOASSETLIST[TargetAsset.ASSET_IMEI].posInfo.lng = latlng.lng;

                    
                    mainView.router.load({
                    url:'resources/templates/asset.playback.show.html',
                        context:{
                            Name: asset.Name,
                            Time: time,
                            //Direction: direct,
                            Mileage: mileage,
                            Speed: speed,
                            Address: LANGUAGE.COM_MSG08,
                            Start: time, 
                            Finish: timeFinish,  
                            Lat: latlng.lat,
                            Lng: latlng.lng,                    
                        }
                    });

                    Protocol.Helper.getAddressByGeocoder(latlng,function(address){
                        $$('body .display_address').html(address);

                        point.customAddress = address;            
                        var newMarkerData = getMarkerDataTablePB(asset, point);
                        window.PosMarker[TargetAsset.ASSET_IMEI].setPopupContent(newMarkerData);
                    });
                }
            }else if(result.MajorCode == '100' && result.MinorCode == '1002'){                
                App.alert(LANGUAGE.ASSET_PLAYBACK_MSG09);
            }else{
                App.alert('Something wrong');
            }
            App.hidePreloader();
        },
        function(){ App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02); }
    ); 
}

function setHistoryArray(array){
    //console.log(array);
    HistoryArray = [];
    $.each( array, function(key,value){    	
    	if ( JSON.stringify(array[key]) !== JSON.stringify(array[key-1]) ) {
	        var index = 0;
	        var point = {};
	        point.positionTime = value[index++];
	        point.lat = value[index++];
	        point.lng = value[index++];
	        point.direct = value[index++];
	        point.speed = value[index++];
	        point.timeSpan = value[index++];
	        point.mileage = value[index++];
	        point.alerts = value[index++];
	        point.statusCode = value[index++];
            point.status = value[index++];

	        HistoryArray.push(point);
	    }
    });
}

function setEventsArray(array){
    //console.log(array);
    EventsArray = [];
    if (array && array.length !== 0) {
        $.each( array, function(key,value){     
            if ( JSON.stringify(array[key]) !== JSON.stringify(array[key-1]) ) {
                var index = 0;
                var point = {};             
                point.assetID = value[index++];
                point.eventClass = value[index++];
                point.eventType = value[index++];
                point.state = value[index++];
                point.otherCode = value[index++];
                point.otherCode2 = value[index++];
                point.contactCode = value[index++];
                point.beginTime = value[index++];
                point.endTime = value[index++];
                point.positionType = value[index++];
                point.lat = value[index++];
                point.lng = value[index++];
                point.alt = value[index++];
                point.alerts = value[index++];
                point.status = value[index++];
                point.content = value[index++];

                EventsArray.push(point);
            }
        });
    }
        
}

function updateAssetsPosInfo(){    
    var userInfo = getUserinfo();  
    var assetList = getAssetList();
    var codes = '';
    $.each(assetList, function(index, val){
        codes += val.Id+','; 
    });
    if (codes) {
        codes = codes.slice(0, -1);
    }
    //var url = API_URL.URL_GET_ALL_POSITIONS.format(userInfo.MinorToken); 
    var url = API_URL.URL_GET_ALL_POSITIONS2.format(userInfo.MinorToken,userInfo.MajorToken); 
    var data = {        
        'codes': codes,
    };
    //console.log(data);
    //JSON1.request(url, function(result){ 
    JSON1.requestPost(url,data, function(result){    
    
            //console.log(result);                     
            if (result.MajorCode == '000') {
                var data = result.Data;  
                var posData = ''; 
                var imei = '';            
                $.each( data, function( key, value ) {  
                    posData = value;
                    imei = posData[1];     
                    if (POSINFOASSETLIST[imei] && !POSINFOASSETLIST[imei].posInfo.positionTime || POSINFOASSETLIST[imei] && posData[5] >= POSINFOASSETLIST[imei].posInfo.positionTime._i ) {                   
                        POSINFOASSETLIST[imei].initPosInfo(posData); 
                    }               
                                    
                }); 
                updateAssetsListStats();              
            }  
        },
        function(){ }
    ); 
}
   
    


function updateAssetsListStats(){
    var assetFeaturesStatus = '';
    var state = '';
    var value = '';        
    $.each( POSINFOASSETLIST, function( key, val ) {          
        assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(POSINFOASSETLIST[key]); 
        if (assetFeaturesStatus.GSM) {
            state = $$("#signal-state"+key);
            state.removeClass('state-0 state-1 state-2 state-3');         
            state.addClass(assetFeaturesStatus.GSM.state);  
        } 
        if (assetFeaturesStatus.GPS) {
            state = $$("#satellite-state"+key);
            state.removeClass('state-0 state-1 state-2 state-3');  
            state.addClass(assetFeaturesStatus.GPS.state); 
        } 
        if (assetFeaturesStatus.geolock) {
            state = $$("#geolock-state"+key);
            state.removeClass('state-0 state-1 state-2 state-3');  
            state.addClass(assetFeaturesStatus.geolock.state); 
        } 
        if (assetFeaturesStatus.immob) {
            state = $$("#immob-state"+key);
            state.removeClass('state-0 state-1 state-2 state-3');  
            state.addClass(assetFeaturesStatus.immob.state); 
        }
        if (assetFeaturesStatus.status) {
            state = $$("#status-state"+key);
            state.removeClass('state-0 state-1 state-2 state-3');  
            state.addClass(assetFeaturesStatus.status.state);  
            value = $$("#status-value"+key);        
            value.html(assetFeaturesStatus.status.value); 
        }   

        if (assetFeaturesStatus.speed) {
            value = $$("#speed-value"+key);        
            value.html(assetFeaturesStatus.speed.value);   
        }  
        if (assetFeaturesStatus.temperature) {
            value = $$("#temperature-value"+key);        
            value.html(assetFeaturesStatus.temperature.value);   
        }  
        if (assetFeaturesStatus.fuel) {
            value = $$("#fuel-value"+key);        
            value.html(assetFeaturesStatus.fuel.value);   
        } 
        if (assetFeaturesStatus.voltage) {
            value = $$("#voltage-value"+key);        
            value.html(assetFeaturesStatus.voltage.value);   
        }  
        if (assetFeaturesStatus.battery) {
            value = $$("#battery-value"+key);        
            value.html(assetFeaturesStatus.battery.value);   
        }  
        if (assetFeaturesStatus.acc) {
            value = $$("#acc-value"+key);        
            value.html(assetFeaturesStatus.acc.value);   
        }
        /*if (assetFeaturesStatus.driver) {
            value = $$("#driver-value"+key);        
            value.html(assetFeaturesStatus.battery.value); 
        } */   
    }); 

    var activePage = mainView.activePage;   
    if ( typeof(activePage) != 'undefined' && activePage.name == "asset.status") {          
        if (TargetAsset.ASSET_IMEI) {
            var asset = POSINFOASSETLIST[TargetAsset.ASSET_IMEI];
            if (asset) {
                assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(asset);
                if (assetFeaturesStatus && assetFeaturesStatus.stats) { 
                    var direct = asset.posInfo.direct;
                    var deirectionCardinal = Protocol.Helper.getDirectionCardinal(direct);
                    var statusPageContainer = $$('.status_page'); 
                    var stoppedDurationContainer = statusPageContainer.find('.position_stoppedDuration');
                    

                    statusPageContainer.find('.position_time').html(asset.posInfo.positionTime.format(window.COM_TIMEFORMAT));                
                    statusPageContainer.find('.position_speed').html(Protocol.Helper.getSpeedValue(asset.Unit, asset.posInfo.speed) + ' ' + Protocol.Helper.getSpeedUnit(asset.Unit));  
                    statusPageContainer.find('.position_direction').html(deirectionCardinal+' ('+direct+'&deg;)');

                    if (prevStatusLatLng.lat != asset.posInfo.lat || prevStatusLatLng.lng != asset.posInfo.lng) {
                        prevStatusLatLng = {
                            'lat': asset.posInfo.lat,
                            'lng': asset.posInfo.lng,
                        };
                        statusPageContainer.find('.position_coords').html('GPS: ' + Protocol.Helper.convertDMS(asset.posInfo.lat, asset.posInfo.lng));
                        Protocol.Helper.getAddressByGeocoder(prevStatusLatLng,function(address){
                            statusPageContainer.find('.display_address').html(address);
                        });  
                    }                       

                    if (assetFeaturesStatus.acc) {
                        statusPageContainer.find('.position_acc').html(assetFeaturesStatus.acc.value);            
                    } 
                    if (assetFeaturesStatus.acc2) {
                        statusPageContainer.find('.position_acc2').html(assetFeaturesStatus.acc2.value);   
                    }    
                    if (assetFeaturesStatus.fuel) {
                        statusPageContainer.find('.position_fuel').html(assetFeaturesStatus.fuel.value);
                    }                
                    if (assetFeaturesStatus.voltage) {
                        statusPageContainer.find('.position_voltage').html(assetFeaturesStatus.voltage.value);
                    } 
                    if (assetFeaturesStatus.battery) {
                        statusPageContainer.find('.position_battery').html(assetFeaturesStatus.battery.value);
                    }   
                    if (assetFeaturesStatus.temperature) {
                        statusPageContainer.find('.position_temperature').html(assetFeaturesStatus.temperature.value); 
                    } 
                    if (assetFeaturesStatus.mileage) {
                        statusPageContainer.find('.position_mileage').html(assetFeaturesStatus.mileage.value);  
                        statusPageContainer.find('.position_engineHours').html(assetFeaturesStatus.engineHours.value); 
                    } 
                    if (assetFeaturesStatus.power) {
                        statusPageContainer.find('.position_power').html(assetFeaturesStatus.power.value); 
                    }
                    if (assetFeaturesStatus.stopped && stoppedDurationContainer.length > 0) {
                        stoppedDurationContainer.html(assetFeaturesStatus.stopped.duration);
                    }else if (stoppedDurationContainer.length > 0) {
                        stoppedDurationContainer.html('-');
                    }  

                    statusPageContainer.find('.position_immob').removeClass('state-0 state-1 state-2 state-3').addClass(assetFeaturesStatus.immob.state);
                    statusPageContainer.find('.position_geolock').removeClass('state-0 state-1 state-2 state-3').addClass(assetFeaturesStatus.geolock.state);                
                }
            } 
        }
    }
}

function setAssetList(list){    
    var ary = {};    
    for(var i = 0; i < list.length; i++) { 
        var index = 0;    
        ary[list[i][1]] = {                      
            Id: list[i][index++],
            IMEI: list[i][index++],
            Name: list[i][index++],
            TagName: list[i][index++],
            Icon: list[i][index++],
            Unit: list[i][index++], 
            InitMileage: list[i][index++],
            InitAcconHours: list[i][index++],
            State: list[i][index++],
            ActivateDate: list[i][index++],
            PRDTName: list[i][index++],
            PRDTFeatures: list[i][index++],
            PRDTAlerts: list[i][index++],
            Describe1: list[i][index++],
            Describe2: list[i][index++],
            Describe3: list[i][index++],
            Describe4: list[i][index++],
            Describe5: list[i][index++],
            _FIELD_FLOAT1: list[i][index++],
            _FIELD_FLOAT2: list[i][index++],
            _FIELD_FLOAT7: list[i][index++],
            Describe7: list[i][index++],
            AlarmOptions: list[i][index++],
            _FIELD_FLOAT8: list[i][index++],
            StatusNew: list[i][index++],
            _FIELD_INT2: list[i][index++],
            GroupCode: list[i][index++],
            Registration: list[i][index++],
            StockNumber: list[i][index++],
            MaxSpeed: list[i][index++],
            MaxSpeedAlertMode: list[i][index++],
        };        
    }
    setAssetListPosInfo(ary);  

    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(ary));
}
function getAssetList(){
    var ret = null;
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.ASSETLIST");
    if(str)
    {
        ret = JSON.parse(str);              
    }
    return ret;
}
function updateAssetList(asset){
    var list = getAssetList();    
       
    POSINFOASSETLIST[asset.IMEI].IMEI = list[asset.IMEI].IMEI = asset.IMEI;
    POSINFOASSETLIST[asset.IMEI].Name = list[asset.IMEI].Name = asset.Name;
    POSINFOASSETLIST[asset.IMEI].Registration = list[asset.IMEI].Registration = asset.Registration;
    POSINFOASSETLIST[asset.IMEI].TagName = list[asset.IMEI].TagName = asset.Tag;
    POSINFOASSETLIST[asset.IMEI].Unit = list[asset.IMEI].Unit = asset.Unit;
    POSINFOASSETLIST[asset.IMEI].InitMileage = list[asset.IMEI].InitMileage = asset.Mileage;
    POSINFOASSETLIST[asset.IMEI].InitAcconHours = list[asset.IMEI].InitAcconHours = asset.Runtime;
    POSINFOASSETLIST[asset.IMEI].Describe1 = list[asset.IMEI].Describe1 = asset.Describe1;
    POSINFOASSETLIST[asset.IMEI].Describe2 = list[asset.IMEI].Describe2 = asset.Describe2;
    POSINFOASSETLIST[asset.IMEI].Describe3 = list[asset.IMEI].Describe3 = asset.Describe3;
    POSINFOASSETLIST[asset.IMEI].Describe4 = list[asset.IMEI].Describe4 = asset.Describe4; 
    if (asset.Icon) {
        POSINFOASSETLIST[asset.IMEI].Icon = list[asset.IMEI].Icon = asset.Icon +'?'+ new Date().getTime();
    }
    POSINFOASSETLIST[asset.IMEI].MaxSpeed = list[asset.IMEI].MaxSpeed = asset.MaxSpeed;
    
    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(list));
}

function updateAssetList3(assets) {
    var list = getAssetList();

    for (var i = assets.length - 1; i >= 0; i--) {
        if (assets[i].IMEI && assets[i].Props) {
            let keys = Object.keys(assets[i].Props);
            for (const key of keys) {
                list[assets[i].IMEI][key] = assets[i].Props[key];
                if (POSINFOASSETLIST[assets[i].IMEI]) {
                    POSINFOASSETLIST[assets[i].IMEI][key] = assets[i].Props[key];
                }
            }
        }
    }
    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(list));
}

function updateAssetList2(list){
    var ary = {};    
    for(var i = 0; i < list.length; i++) { 
        var index = 0;    
        ary[list[i][1]] = {                      
            Id: list[i][index++],
            IMEI: list[i][index++],
            Name: list[i][index++],
            TagName: list[i][index++],
            Icon: list[i][index++],
            Unit: list[i][index++], 
            InitMileage: list[i][index++],
            InitAcconHours: list[i][index++],
            State: list[i][index++],
            ActivateDate: list[i][index++],
            PRDTName: list[i][index++],
            PRDTFeatures: list[i][index++],
            PRDTAlerts: list[i][index++],
            Describe1: list[i][index++],
            Describe2: list[i][index++],
            Describe3: list[i][index++],
            Describe4: list[i][index++],
            Describe5: list[i][index++],
            _FIELD_FLOAT1: list[i][index++],
            _FIELD_FLOAT2: list[i][index++],
            _FIELD_FLOAT7: list[i][index++],
            Describe7: list[i][index++],   
            AlarmOptions: list[i][index++],        
            _FIELD_FLOAT8: list[i][index++],
            StatusNew: list[i][index++],
            _FIELD_INT2: list[i][index++],
            GroupCode: list[i][index++],
            Registration: list[i][index++],
            StockNumber: list[i][index++],
            MaxSpeed: list[i][index++],
            MaxSpeedAlertMode: list[i][index++],
        }; 
        /*$.each(ary[list[i][1]], function(key,value){
            if (POSINFOASSETLIST[list[i][1]]) {
                POSINFOASSETLIST[list[i][1]][key] = value;
            }            
        });   */
        if (POSINFOASSETLIST[list[i][1]]) {  
            POSINFOASSETLIST[list[i][1]].StatusNew =  ary[list[i][1]].StatusNew;
        }
    }

    if ($$('.status_page').length > 0 && TargetAsset.ASSET_IMEI && POSINFOASSETLIST[TargetAsset.ASSET_IMEI]) {            
        var assetFeaturesStatus = Protocol.Helper.getAssetStateInfo(POSINFOASSETLIST[TargetAsset.ASSET_IMEI]);
        if (assetFeaturesStatus && assetFeaturesStatus.stats) {          
            console.log(assetFeaturesStatus);
            var params = {
                id: '',
                imei: TargetAsset.ASSET_IMEI,
                name: 'Geolock',
                state: assetFeaturesStatus.geolock.value,
            };  
            changeIconColor(params);
            changeSwitcherState(params);

            /*params = {
                id: '',
                imei: TargetAsset.ASSET_IMEI,
                name: 'Immobilise',
                state: assetFeaturesStatus.immob.value,
            };  
            changeIconColor(params);
            changeSwitcherState(params);*/
        }
           
    }

    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(ary));
}

/*function setAssetListPosInfo(listObj){    
    var userInfo = getUserinfo();   
     
    var url = API_URL.URL_GET_ALL_POSITIONS.format(userInfo.MinorToken); 
    
    JSON1.request(url, function(result){                          
            if (result.MajorCode == '000') {
                var data = result.Data;    

                $.each( data, function( key, value ) {  
                    var posData = value;
                    var imei = posData[1];
                    var protocolClass = posData[2];
                    var deviceInfo = listObj[imei];               
                    
                    POSINFOASSETLIST[imei] = Protocol.ClassManager.get(protocolClass, deviceInfo);
                    POSINFOASSETLIST[imei].initPosInfo(posData); 
                });
                //console.log(POSINFOASSETLIST);
                init_AssetList(); 
                initSearchbar(); 
                App.hidePreloader();

            }else{
                console.log(result);
            }
        },
        function(){ }
    ); 
}*/

function setAssetListPosInfo(listObj){    
    var userInfo = getUserinfo();  
   
    var codes = '';
    $.each(listObj, function(index, val){
        codes += val.Id+','; 
    });
    if (codes) {
        codes = codes.slice(0, -1);
    }
    var url = API_URL.URL_GET_ALL_POSITIONS2.format(userInfo.MinorToken,userInfo.MajorToken); 
    var data = {        
        'codes': codes,
    };
    //console.log(data);
    JSON1.requestPost(url,data, function(result){   
            //console.log(result);  
                           
            if (result.MajorCode == '000') {
                var data = result.Data;    
                if (result.Data) {
                    $.each( result.Data, function( key, value ) {  
                        var posData = value;
                        var imei = posData[1];
                        var protocolClass = posData[2];
                        var deviceInfo = listObj[imei];               
                        
                        POSINFOASSETLIST[imei] = Protocol.ClassManager.get(protocolClass, deviceInfo);
                        POSINFOASSETLIST[imei].initPosInfo(posData); 
                        
                    });
                    
                }
                  
            }else{
                //console.log(result);
            }
            App.hidePreloader();          
            init_AssetList(); 
            initSearchbar();
            setTimeout(function() {
                if (!localStorage.ModalReview && localStorage.FirstLoginDone) {
                    showAskForReviewMessage();
                }

                if (!localStorage.FirstLoginDone) {
                    localStorage.FirstLoginDone = true;
                }
            }, 5000);
            localStorage.loginDone = 1;         
        },
        function(){ }
    ); 
}

function updateAssetListPosInfo(posData){                                   
    POSINFOASSETLIST[posData[1]].initPosInfo(posData);
}

function checkBalance(alert){
    if (alert) {
        App.showPreloader();
    }
    var userInfo = getUserinfo(); 
    var url = API_URL.URL_GET_BALANCE.format(userInfo.MajorToken, userInfo.MinorToken);                         
    JSON1.request(url, function(result){            
            if (result.MajorCode == '000') {                    
                userInfo.User.Credits = result.Data.SMSTimes;  
                setUserinfo(userInfo); 
                if (alert) {                                  
                    App.alert(LANGUAGE.PROMPT_MSG031+': '+result.Data.SMSTimes);
                }       
                updateUserCredits(result.Data.SMSTimes);                   
            }
            App.hidePreloader();
        },
        function (){App.hidePreloader();App.alert(LANGUAGE.COM_MSG02);}
    );
}

function updateUserCredits(credits){
    console.log(credits);
    $$('body .remaining_counter').html(credits);

    /*setTimeout(function() {
        checkIsBalanceLow(credits);
    }, 1000);*/
}

function setAlarmList(options){
    var list = getAlarmList();
    if (!list) {        
        list = {};       
    }      
    list[options.IMEI] = options;
    
    localStorage.setItem("COM.QUIKTRAK.LIVE.ALARMLIST", JSON.stringify(list));   
}
function getAlarmList(){
    var ret = null;var str = localStorage.getItem("COM.QUIKTRAK.LIVE.ALARMLIST");if(str){ret = JSON.parse(str);}return ret;
}
function updateAlarmOptVal(alarmOptions) {
    var IMEI = alarmOptions.IMEI.split(','); 
    var assetList = getAssetList();
    
    if (IMEI) {        
        $.each(IMEI, function(index, value){               
            assetList[value].AlarmOptions = alarmOptions.options;
        });
    }
    
    localStorage.setItem("COM.QUIKTRAK.LIVE.ASSETLIST", JSON.stringify(assetList));
}

function getNewData(){
    getPlusInfo();
    //hideKeyboard();    
    
    var mobileToken = !localStorage.PUSH_MOBILE_TOKEN? '123' : localStorage.PUSH_MOBILE_TOKEN;
    var appKey = !localStorage.PUSH_APP_KEY? '4SSm4aQPNj6uI5NlWmGsGA' : localStorage.PUSH_APP_KEY;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN? '123' : localStorage.PUSH_DEVICE_TOKEN;
    var deviceType = !localStorage.DEVICE_TYPE? 'android' : localStorage.DEVICE_TYPE;
   
   // alert('logged in');
    
    var urlLogin = API_URL.URL_GET_LOGIN.format(localStorage.ACCOUNT, 
                                     encodeURIComponent(localStorage.PASSWORD), 
                                     appKey, 
                                     mobileToken, 
                                     encodeURIComponent(deviceToken), 
                                     deviceType);   
    //console.log(urlLogin);                             
    JSON1.request(urlLogin, function(result){
           console.log(result);
            if(result.MajorCode == '000') {                
                setUserinfo(result.Data);
                
                if (result.Data.Devices) {
                    updateAssetList2(result.Data.Devices);
                }
                
            }
        },
        function(){  }
    ); 
   

}

function sortAssetList(elem) {
    if (elem) {
        var $elem = $$(elem);
        var sortType = $elem.data("sort-by");
        //var sortOrder = $elem.data("sort-order");
        if (virtualAssetList && virtualAssetList.items && virtualAssetList.items.length) {
            var assets = virtualAssetList.items;

            assets = sortListByState(assets, sortType);

            virtualAssetList.replaceAllItems(assets);
        }
    }
    App.closeModal();
}

function sortListByState(array, sortType) {
    if (array && array.length) {
        array.sort(function(a, b) {
            if (a.Name < b.Name) return -1;
            if (a.Name > b.Name) return 1;
            return 0;
        });

        switch (sortType) {
            case 'state':
                var oneDay = 1000 * 60 * 60 * 24;
                var now = moment();
                var arrayOnline = [];
                var arrayOffline = [];
                for (var i = 0; i < array.length; i++) {
                    if (POSINFOASSETLIST[array[i].IMEI] && POSINFOASSETLIST[array[i].IMEI].posInfo && POSINFOASSETLIST[array[i].IMEI].posInfo.positionTime) {
                        var dateDifference = Protocol.Helper.getDifferenceBTtwoDates(POSINFOASSETLIST[array[i].IMEI].posInfo.positionTime, now);
                        if (dateDifference <= oneDay) {
                            arrayOnline.push(array[i]);
                        } else {
                            arrayOffline.push(array[i]);
                        }
                    } else {
                        arrayOffline.push(array[i]);
                    }
                }
                array = arrayOnline.concat(arrayOffline);

                break;
        }
    }
    return array;
}

function getNewNotifications(params){         
    var userInfo = getUserinfo();    
    var MinorToken = !userInfo ? '': userInfo.MinorToken;
    var deviceToken = !localStorage.PUSH_DEVICE_TOKEN? '' : localStorage.PUSH_DEVICE_TOKEN;    
    
    if (MinorToken && deviceToken) {
        var container = $$('body');
        if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
        App.showProgressbar(container); 

        var url = API_URL.URL_GET_NEW_NOTIFICATIONS.format(MinorToken,encodeURIComponent(deviceToken)); 
        notificationChecked = 0;

        JSON1.request(url, function(result){
                App.hideProgressbar();            
                notificationChecked = 1;
                if (params && params.ptr === true) {
                    App.pullToRefreshDone();
                }
                if(window.plus) {
                    plus.push.clear();
                }
                
                console.log(result);                       
                if (result.MajorCode == '000') {
                    var data = result.Data;  
                    if (Array.isArray(data) && data.length > 0) {
                        setNotificationList(result.Data);

                        var page = App.getCurrentView().activePage;        
                        if ( page && page.name != "notification" ) {
                            $$('.notification_button').addClass('new_not');                    
                        }else{
                            showNotification(result.Data);
                        }
                    }
                    
                }else{
                    console.log(result);
                }
                
            },
            function(){
                App.hideProgressbar();
                notificationChecked = 1; 
                if (params && params.ptr === true) {
                    App.pullToRefreshDone();
                }           
            }
        ); 
    }        
}

function removeNotificationListItem(index){
    var list = getNotificationList();
    var user = localStorage.ACCOUNT;
    
    list[user].splice(index, 1);
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST.BW", JSON.stringify(list));
    var existLi = $$('.notification_list li');
    index = existLi.length - 2;
    existLi.each(function(){
        var currentLi = $$(this);
        if (!currentLi.hasClass('deleting')) {
            currentLi.attr('data-id', index);
            index--;
        }
    });
    virtualNotificationList.clearCache();    
}
function removeAllNotifications(){
    var list = getNotificationList();
    var user = localStorage.ACCOUNT;
    list[user] = [];
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST.BW", JSON.stringify(list));
    virtualNotificationList.deleteAllItems();   
}
function setNotificationList(list){ 
    var pushList = getNotificationList();    
    var user = localStorage.ACCOUNT;   
          
    if (pushList) { 
        if (!pushList[user]) {
            pushList[user] = [];
        }
    }else{
        pushList = {};
        pushList[user] = [];
    }     
    
    if (Array.isArray(list)) { 
        var msg = null; 
        var localTime = null;
        var popped = null;
        for (var i = 0; i < list.length; i++) { 
            msg = null;  
            localTime = null;
            popped = null;
            if (list[i].payload) {
                msg = isJsonString(list[i].payload);            
                if (!msg) {                  
                    msg = list[i].payload;    
                }
            }else if(list[i]){
                msg = isJsonString(list[i]); 
                if (!msg) {                  
                    msg = list[i];    
                }
            }
            if (msg) {                              
                if (msg.time) {
                    localTime  = moment.utc(msg.time).toDate();
                    msg.time = moment(localTime).format(window.COM_TIMEFORMAT);                        
                    list[i] = msg;
                    
                    popped = pushList[user].pop();                    
                    if (popped) {
                        popped = JSON.stringify(popped);
                        msg = JSON.stringify(msg);                        
                        if (popped != msg) {
                            popped = JSON.parse(popped);
                            pushList[user].push(popped);
                        }
                    }       

                    pushList[user].push(list[i]);                      
                } 
            }                                        
        }    
    }
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST.BW", JSON.stringify(pushList));
}

function getNotificationList(){
    var ret = {};var str = localStorage.getItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST.BW");if(str) {ret = JSON.parse(str);}return ret;
}

function clearNotificationList(){
    var list = getNotificationList();
    var user = localStorage.ACCOUNT;   
    if(list) {
        list[user] = [];
    }
    localStorage.setItem("COM.QUIKTRAK.LIVE.NOTIFICATIONLIST.BW", JSON.stringify(list));
}

function showNotification(list){    
    var data = null;
    var isJson =''; 
    var newList = [];
    var index = parseInt($('.notification_list li').first().data('id'));
    if (list) {       
        for (var i = 0; i < list.length; i++) { 
            data = null;
            isJson =''; 
            if (list[i].payload) {
                isJson = isJsonString(list[i].payload);
                if (isJson) {
                    data = isJson;                
                }else{
                    data = list[i].payload;                
                } 
            }else{
                isJson = isJsonString(list[i]);
                if (isJson) {
                    data = isJson;                
                }else{
                    data = list[i];                
                } 
            } 
            if (data) {
                if (isNaN(index)) {                    
                    index = 0;
                }else{
                    index++;                    
                }                           
                data.listIndex = index; 
                 
                if (data.time) {
                    data.time = data.time.replace("T", " ");
                }                
                
                if (data.title) {
                    data.title = toTitleCase(data.title);
                }                 
                newList.unshift(data);                          
            }
        }
        if (virtualNotificationList && newList.length !== 0) {
            virtualNotificationList.prependItems(newList); 
        }   
    }       
}

function processClickOnPushNotification(msgJ){    
    if (Array.isArray(msgJ)) {      
        var msg = null;
        msg = isJsonString(msgJ[0]);        

        if (!msg) {                  
            msg = msgJ[0];     
        }
        
        if (msg && msg.time && msg.name && msg.title) {
            //var activePage = App.getCurrentView().activePage;  
           
            //if ( typeof(activePage) == 'undefined' || (activePage && activePage.name != "notification")) {               
           /* if ( typeof(activePage) == 'undefined' || (activePage && activePage.name != "notification")) {
                mainView.router.refreshPage();
            }   */

            if (parseFloat(msg.lat) && parseFloat(msg.lng)) {               
                TargetAsset.ASSET_IMEI = msg.imei;
                TargetAsset.ASSET_NAME = msg.name; 
                if (msg.time) {
                    var localTime = moment.utc(msg.time).toDate();
                    msg.time = moment(localTime).format(window.COM_TIMEFORMAT);                         
                }
                loadTrackPage(msg);                    
            }else{
                App.alert(LANGUAGE.PROMPT_MSG023);
            }
            /*}else{                
                mainView.router.refreshPage();
            }   */    
        }  
    }          
}


function showMsgNotification(arrMsgJ){
       
                
    if (Array.isArray(arrMsgJ)) {
        var page = App.getCurrentView().activePage;     
        var msg = null;
        if (arrMsgJ[0].payload) {
            msg = isJsonString(arrMsgJ[0].payload);
            if (!msg) {                  
                msg = arrMsgJ[0].payload;     
            }
        }else{
            msg = isJsonString(arrMsgJ[0]);
            if (!msg) {                  
                msg = arrMsgJ[0];     
            }
        }    
        if (msg && msg.title && msg.name) {
            if ( page.name != "notification" ) {
                $$('.notification_button').addClass('new_not');
                var message = msg.name+'</br>'+msg.title;        
                App.addNotification({
                    hold: 5000,
                    message: message,
                    button: {
                        text: LANGUAGE.COM_MSG12,
                        color: 'boatwatch',
                        close: false,         
                    },
                    onClick: function () { 
                        App.closeNotification('.notifications');
                        $$('.notification_button').removeClass('new_not'); 
                        
                        //mainView.router.loadPage('resources/templates/notification.html');
                        processClickOnPushNotification([msg]);

                    },                          
                });                
            }
                

            /*if (msg.imei && msg.type && parseInt(msg.type) == 1024 ) {  //geolock                
                var params = {
                    id: '',
                    imei: msg.imei,
                    name: 'Geolock',
                    state: false,
                };               
                setStatusNewState({
                    asset: params.imei,                        
                    forAlarm: params.name,
                    state: params.state,                    
                });  
                changeIconColor(params);
                changeSwitcherState(params);
            }   */        
        }          
    }  
}

function setMapSettigns(list){
    localStorage.setItem("COM.QUIKTRAK.LIVE.MAPSETTINGS", JSON.stringify(list));
}
function getMapSettings() {
    var ret = {};
    var str = localStorage.getItem("COM.QUIKTRAK.LIVE.MAPSETTINGS");
    if(str) {
        ret = JSON.parse(str);
    }
    return ret;
}

function setGeoFenceList(list){
    localStorage.setItem("COM.QUIKTRAK.LIVE.GEOFENCELIST", JSON.stringify(list));
}
function getGeoFenceList(){
    var ret = null;var str = localStorage.getItem("COM.QUIKTRAK.LIVE.GEOFENCELIST");if(str){ret = JSON.parse(str);}return ret;
}

function loadGeofenceViewPage(code){
    var geofence = getGeoFenceList()[code];
    mainView.router.load({
        url: 'resources/templates/geofence.view.html',
        context: {
            GeofenceName: geofence.Name,
            Code: geofence.Code,
        }
    });
}

function editGeofence(code) {
    var geofence = getGeoFenceList()[code];
    var assetList = formatArrAssetList();

    if (geofence.SelectedAssetList && geofence.SelectedAssetList.length > 0) {
        $.each(assetList, function(index, value) {
            $.each(geofence.SelectedAssetList, function(index1, value1) {
                if (value1.AsCode == value.Id) {
                    value.Selected = 1;
                }
            });
        });
    }

    var AlarmIn = 0;
    var AlarmOut = 0;
    if (geofence.Alerts == 24) {
        AlarmIn = 1;
        AlarmOut = 1;
    } else if (geofence.Alerts == 16) {
        AlarmOut = 1;
    } else {
        AlarmIn = 1;
    }

    var daysOfWeekArray = [{
        val: 0,
        name: LANGUAGE.GEOFENCE_MSG_20,
        selected: false,
    },
        {
            val: 1,
            name: LANGUAGE.GEOFENCE_MSG_21,
            selected: false,
        },
        {
            val: 2,
            name: LANGUAGE.GEOFENCE_MSG_22,
            selected: false,
        },
        {
            val: 3,
            name: LANGUAGE.GEOFENCE_MSG_23,
            selected: false,
        },
        {
            val: 4,
            name: LANGUAGE.GEOFENCE_MSG_24,
            selected: false,
        },
        {
            val: 5,
            name: LANGUAGE.GEOFENCE_MSG_25,
            selected: false,
        },
        {
            val: 6,
            name: LANGUAGE.GEOFENCE_MSG_26,
            selected: false,
        },
    ];

    var BeginTime = '19:00';
    var EndTime = '06:00';
    if (geofence.Week && geofence.Week.length) {
        $.each(geofence.Week, function(index, value) {
            var dayIndex = daysOfWeekArray.findIndex(x => x.val === value.Week);
            daysOfWeekArray[dayIndex].selected = true;
        });
        BeginTime = geofence.Week[0].BeginTime ? moment(geofence.Week[0].BeginTime, 'HH:mm:ss').add(UTCOFFSET, 'minutes').format('HH:mm:ss') : BeginTime;
        EndTime = geofence.Week[0].EndTime ? moment(geofence.Week[0].EndTime, 'HH:mm:ss').add(UTCOFFSET, 'minutes').format('HH:mm:ss') : EndTime;
    }


    mainView.router.load({
        url: 'resources/templates/geofence.add.html',
        context: {
            GeofenceName: geofence.Name,
            Assets: assetList,
            Edit: code,
            Radius: geofence.Radius,
            Address: geofence.Address,
            Name: geofence.Name,
            GeofenceState: geofence.State,
            AlarmIn: AlarmIn,
            AlarmOut: AlarmOut,
            DaysOfWeek: daysOfWeekArray,
            BeginTime: BeginTime,
            EndTime: EndTime,
            IgnoreBetween: geofence.Inverse,
            Share: geofence.Share
        }
    });

}

function deleteGeofence(code, index) {
    var userInfo = getUserinfo();
    var data = {
        MajorToken: userInfo.MajorToken,
        Code: code
    };

    App.showPreloader();
    $.ajax({
        type: "POST",
        url: API_URL.URL_GEOFENCE_DELETE,
        data: data,
        async: true,
        crossDomain: true,
        cache: false,
        success: function(result) {
            App.hidePreloader();
            if (result.MajorCode == '000') {

                //Fix: some time virtual list do not remove feleted items, so first we hide deleted then remove
                var geofenceListContainer = $$('.geofenceList ul');
                var itemDelete = geofenceListContainer.find('li[data-index="' + index + '"]');
                itemDelete.hide();

                virtualGeofenceList.deleteItem(index);

            } else {
                App.alert(LANGUAGE.PROMPT_MSG013);
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            App.hidePreloader();
            App.alert(LANGUAGE.COM_MSG02);
        }
    });
}

function changeGeofenceState(geofence, state) {
    if (geofence && typeof(geofence) == 'object') {
        var assetCodes = '';
        if (geofence.SelectedAssetList && geofence.SelectedAssetList.length > 0) {
            $.each(geofence.SelectedAssetList, function(key, val) {
                assetCodes += ',' + val.AsCode;
            });
        }
        if (assetCodes) {
            assetCodes = assetCodes.substr(1);
        }
        var userInfo = getUserinfo();
        var data = {
            MajorToken: userInfo.MajorToken,
            MinorToken: userInfo.MinorToken,
            Name: geofence.Name,
            Lat: geofence.Lat,
            Lng: geofence.Lng,
            Radius: geofence.Radius,
            Alerts: geofence.Alerts,
            DelayTime: 0,
            AlertConfigState: state,
            GeoType: 1,
            AssetCodes: assetCodes,
            Address: geofence.Address,
            Code: geofence.Code,
            Inverse: geofence.Inverse ? geofence.Inverse : 0,
        };
        if (geofence.Week && geofence.Week.length) {
            data.BeginTime = geofence.Week[0].BeginTime ? geofence.Week[0].BeginTime : '';
            data.EndTime = geofence.Week[0].EndTime ? geofence.Week[0].EndTime : '';

            data.Days = geofence.Week.map(x => x.Week).toString();
        }
        console.log(data);
        var url = API_URL.URL_GEOFENCE_EDIT;
        saveGeofence(url, data);
    }
}

function saveGeofence(url, params) {
    if (url && params) {
        App.showPreloader();
        $.ajax({
            type: "POST",
            url: url,
            data: params,
            async: true,
            cache: false,
            crossDomain: true,
            success: function(result) {
                App.hidePreloader();
                if (result.MajorCode == '000') {
                    var currentPage = App.getCurrentView().activePage;
                    if (currentPage.name != 'geofence') {
                        loadGeofencePage();
                    } else {
                        $$('[data-page="' + currentPage.name + '"] [data-code="' + params.Code + '"]').data('state', params.AlertConfigState);
                    }

                } else {
                    App.alert(LANGUAGE.PROMPT_MSG013);
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                App.hidePreloader();
                App.alert(LANGUAGE.COM_MSG02);
            }
        });
    }
}

function formatArrAssetList(){
    var assetList = getAssetList(); 
    var newAssetlist = [];
    if (assetList) {
        var keys = Object.keys(assetList);
            
        $.each(keys, function( index, value ) {        
            newAssetlist.push(assetList[value]);       
        });

        newAssetlist.sort(function(a,b){
            if(a.Name < b.Name) return -1;
            if(a.Name > b.Name) return 1;
            return 0;
        });     
    }
    return newAssetlist;   
}

function initSettingsButton() {

    var userInfo = getUserinfo();

    var data = {
        MajorToken: userInfo.MajorToken,
        MinorToken: userInfo.MinorToken
    };

    var container = $$('body');
    if (container.children('.progressbar, .progressbar-infinite').length) return; //don't run all this if there is a current progressbar loading
    App.showProgressbar(container);
    //App.showPreloader();
    $.ajax({
        type: "POST",
        url: API_URL.URL_GET_GEOFENCE_LIST,
        data: data,
        async: true,
        crossDomain: true,
        cache: false,
        success: function(result) {
            //App.hidePreloader();
            App.hideProgressbar();
            if (result.MajorCode == '000') {
                var geofenceList = result.Data;
                setGeoFenceList(geofenceList);

                var mapSettingsObg = getMapSettings();
                mapSettingsObg && mapSettingsObg.showGeofences ? MapControls.showGeofences() : '';
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            //App.hidePreloader();
            App.hideProgressbar();
            App.alert(LANGUAGE.COM_MSG02);

        }
    });
}
var MapControls = {
    data: {
        Geofences: [],
    },

    isGeofencesShowed: function(){
        return this.data.Geofences.length ? true : false;
    },
    showGeofences: function(){
        var self = this;
        if (!self.isGeofencesShowed()) {
            var geofenceList = getGeoFenceList();// app.methods.getFromStorage('geofenceList');
            //var groupList = app.methods.getFromStorage('groupList');

            if (!isObjEmpty(geofenceList) ) {
                const keys = Object.keys(geofenceList);
                var polygonStyles = Protocol.PolygonCustomization;
                for (const key of keys) {
                    let geofenceDetails = {
                        Name: geofenceList[key].Name,
                        Code: geofenceList[key].Code,
                    };
                    let markerData = getGeofenceDataTable(geofenceList[key],{geogroup: false});
                    if (geofenceList[key].GeoType == 1) { //circle
                        if (geofenceList[key].Lat && geofenceList[key].Lng && geofenceList[key].Radius) {
                            polygonStyles.radius = geofenceList[key].Radius;
                            geofenceDetails.polygon = L.circle([geofenceList[key].Lat, geofenceList[key].Lng], polygonStyles).bindPopup(markerData,{maxWidth: 280, closeButton: false})//.bindTooltip(label ,{permanent: false, direction: 'right'});
                        }
                    }else if (geofenceList[key].GeoPolygon) {
                        var polygonCoordsArr = geofenceList[key].GeoPolygon.split('((').pop().split('))')[0].split(',');
                        var geojsonArr = [];
                        for (var i = polygonCoordsArr.length - 1; i >= 0; i--) {
                            geojsonArr.push(polygonCoordsArr[i].split(' ').map(parseFloat).reverse());
                        }
                        geofenceDetails.polygon = L.polygon(geojsonArr, polygonStyles).bindPopup(markerData,{maxWidth: 280, closeButton: false}); //.bindTooltip(label ,{permanent: false, direction: 'right'});
                    }

                    if (geofenceDetails.polygon) {
                        geofenceDetails.polygon.addTo(MapTrack);
                        self.data.Geofences.push(geofenceDetails);
                    }
                }
            }

        }
    },
    hideGeofences: function(){
        var self = this;
        if (self.data.Geofences && self.data.Geofences.length) {
            for (var i = self.data.Geofences.length - 1; i >= 0; i--) {
                if (self.data.Geofences[i].polygon) {
                    MapTrack.removeLayer(self.data.Geofences[i].polygon);
                }
            }
            self.data.Geofences.length = 0;
        }
    },
    removeGeofence: function(code){
        var self = this;
        if (code && self.data.Geofences && self.data.Geofences.length) {
            let index = self.data.Geofences.findIndex(el => el.Code == code);
            if (index != -1) {
                MapTrack.removeLayer(self.data.Geofences[index].polygon);
            }
        }
    },


    showMapControlls: function(target){
        var self = this;
        var mapSettingsObg = getMapSettings();

        var buttons = [
            {
                text: `<input type="hidden" name="checkbox-map-settings" value="showGeofences" ${ mapSettingsObg && mapSettingsObg.showGeofences ? 'checked' : '' }/>
                        ${ mapSettingsObg.showGeofences ?  LANGUAGE.COM_MSG61 : LANGUAGE.COM_MSG57 }`,
                onClick: function(parent) {
                    var input = $$(parent).find('input[name="checkbox-map-settings"]');
                    var newState = !input.prop( "checked" );

                    mapSettingsObg[input.val()] = newState;

                    setMapSettigns(mapSettingsObg);
                    newState ? MapControls.showGeofences() : MapControls.hideGeofences();

                }

            },

        ];
        App.actions(target, buttons);
    },
};

function isObjEmpty(obj) {
    // null and undefined are "empty"
    if (obj == null) return true;
    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;
    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
}


function isClockwise(poly){
    var sum = 0;
    for (var i=0; i<poly.length-1; i++) {
        var cur = poly[i],
            next = poly[i+1];
        sum += (next.lat - cur.lat) * (next.lng + cur.lng)
    }
    return sum > 0
}


/* ASSET EDIT PHOTO */

var cropper = null;
var resImg = null;
function initCropper(){     
    var image = document.getElementById('image'); 
    //alert(image);     
    cropper = new Cropper(image, {
        aspectRatio: 1/1,
        dragMode:'move',
        rotatable:true,
        minCropBoxWidth:200,
        minCropBoxHeight:200,
        minCanvasWidth:200,
        minCanvasHeight:200,
        minContainerWidth:200,
        minContainerHeight:200,
        crop: function(data) {
         }
    });

}
function saveImg(){
    resImg =  cropper.getCroppedCanvas({
          width: 200,
          height: 200
    }).toDataURL();
    
    $$('.asset_img img').attr('src',resImg);     

    if (TargetAsset.ASSET_IMEI) { 
        $$('.assets_list li[data-imei="'+TargetAsset.ASSET_IMEI+'"] .item-media img').attr('src',resImg);
    }

    var assetImg = {
        data: resImg, 
        id: 'IMEI_'+TargetAsset.ASSET_IMEI
    };                  
 
    App.showPreloader();
    $.ajax({
        type: 'POST',
        url: API_URL.URL_PHOTO_UPLOAD,
        data: assetImg,
        async: true, 
        cache: false,
        crossDomain: true,
        success: function (result) {
            App.hidePreloader(); 
            //var res = JSON.stringify(result);
            //alert(res);
            result = typeof (result) == 'string' ? eval("(" + result + ")") : result;
            if (result.MajorCode == "000") {              
                /*App.alert('Result Data:'+ result.Data);*/
                TargetAsset.ASSET_IMG = result.Data;
            }else{
                App.alert('Something wrong. Photo not saved');
            }
            mainView.router.back();
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){ 
           App.hidePreloader(); App.alert(LANGUAGE.COM_MSG02);
        }
    });       
    
}   


function getImage(source){
    
    if (!navigator.camera) {
        alert("Camera API not supported", "Error");
        
    }else{
        var options = { quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: source,      // 0:Photo Library, 1=Camera, 2=Saved Album
                        encodingType: 0     // 0=JPG 1=PNG
                      };

        navigator.camera.getPicture(
            function(imgData) {
              //$('.media-object', this.$el).attr('src', "data:image/jpeg;base64,"+imgData);
                mainView.router.load({
                    url: 'resources/templates/asset.edit.photo.html',
                    context: {
                        imgSrc: "data:image/jpeg;base64,"+imgData
                    }
                });
            
            },
            function() {
                //alert('Error taking picture', 'Error');
            },
            options);
    }
           
}
