var express = require('express');
var router = express.Router();
var validator = require('validator');
//var sleep = require('sleep');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
require('date-utils');

var ipfsClient = require('ipfs-http-client');
var ipfs_ip;
var ipfs_port;
var full_address;
var ipfs;

var newDate = new Date();
var CurrentTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');

// storage & rename
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = 'task_' + Date.now() + '_' + Math.round(Math.random() * 1E9);
        //cb(null, uniqueSuffix + '_' + file.originalname);
        cb(null, file.originalname);
    }
});
// ext 필터.
var fileFilter = function (req, file, cb) {
    var fileExt = ['.txt', '.json', '.css', '.js', '.exe', '.dll', '.dat', '.bin', ''];
    //debug(file)
    if (file) {
        var ext = path.extname(file.originalname).toLowerCase();
        if (validator.isIn(ext, fileExt)) {
            cb(null, true);
        } else {
            cb(new Error("Upload Files - Format Error"));
        }
    }
};
var upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 10 // 10MB까지만
    }
});

var formidable = require("formidable");
var util = require('util');
const { getPackedSettings } = require('http2');


// 라우터 처리 /json ~ 블라블라 /json/store
router.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/form.html'); // 파일호출을 위하 정확한 경로지정 필수
});

router.post('/store', upload.array('task_file'), async function (req, res, next) {
    //console.log(req.files);

    var obj = {
        proj_ID: req.body.proj_id, //req.body.proj_id, //examples from it will be insert menu.
        msgtype: req.body.msg_type,
        cmd_tag: req.body.cmd_tag,
        proj_sequ: parseInt(req.body.proj_sequ),
        proj_flag: req.body.proj_flag,
        proj_guid: req.body.proj_guid,
        proj_name: req.body.proj_name,
        proj_type: req.body.proj_type,
        proj_desc: req.body.proj_desc,
        st_date: req.body.st_date,
        en_date: req.body.en_date,
        credit: parseInt(req.body.credit),
        pay_type: req.body.pay_type,
        total_task_num: 0,
        done_task_num: 0,
        core_ver: req.body.core_ver,
        core_count: 0,
        Core_Process: []
    };

    obj.task_info = {
        task_ID: "1",
        sub_task_process_count: parseInt(req.body.stp_count), //폼에서 작성할수있도록한다
        task_process_mode: "1",
        task_cre_date: CurrentTime,
        taskName: obj.guid,
        resource_mode: req.body.resource_mode,
        tasknamelist: []
    };

    // Data Server Config
    obj.data_server_info= {
        type: req.body.type,
        ip: req.body.ip,
        port: req.body.port,
        id: req.body.id,
        pw: req.body.pw
    };
    obj.result_data_server_info= {
        type: req.body.type,
        ip: req.body.ip,
        port: req.body.port,
        id: req.body.id,
        pw: req.body.pw
    };

    // ipfs 함수사용을 위한 선언
    ipfs_ip = req.body.ip;
    ipfs_port = req.body.port;
    full_address = 'http://' + ipfs_ip + ":" + ipfs_port;


    var files = req.files;
    //console.log(files);
    var fileinfo = new Object();

    if (Array.isArray(files)) {
        //var Proj_ID = "10001"; //examples from it will be insert menu.

        fileinfo.rootpath = ""; //__dirname; //upper(root) path for tasksfold
        fileinfo.coreinfo = {
            core_count: 0,
            corelist: []
        };

        fileinfo.taskinfo = {
            task_count: 0,
            tasklist: []
        };
        //console.log('info :', fileinfo);

        var dirName = 'uploads/';
        // 업로드 되는 파일수 반복처리
        for (var i = 0; i < files.length; i++) {
            var orgName = files[i].originalname;
            var filePath = dirName + orgName;

            //console.log('orgName :', orgName);

            // 구분자 처리
            var split = orgName.split("_");
            var pre_fix = split[0]; // Proccess, Doc, Info 제일 상위 접두어 구분처리

            // 상위 접두어
            if ((pre_fix == "P") || (pre_fix == "D") || (pre_fix == "I")) {
                var os_pfix         = split[1]; // OS 구분
                var proj_pfix       = split[2]; // 프로젝트 ID
                var taskid_pfix     = split[3]; // task ID
                var subtaskid_pfix  = split[4]; // sub task ID(count index)
                subtaskid_pfix = orgName; // 파일명 -> task_sub_접두어

                // Description
                // D_LINUX_10001_0001_00 //접두어_OS_프로젝트ID_TaskID_SubTaskID

                if (obj.proj_ID == proj_pfix) {
                    if ((os_pfix.toUpperCase() == "WIN") || (os_pfix.toUpperCase() == "MAC") || (os_pfix.toUpperCase() == "LINUX")) {
                        var item_info = {
                            sub_task_id: `${taskid_pfix}`,
                            sub_info: [],
                            D: [],
                            I: []
                        };
                        var sub_info = {
                            OS_TYPE: `${os_pfix}`,
                            P: []
                        };
                        
                        // IPFS 등록을 위한 변수 선언
                        var hash = await addFile(`${subtaskid_pfix}`, dirName + `${subtaskid_pfix}`);
                        var pushDataSub = new Object();
                        pushDataSub.NAME = `${subtaskid_pfix}`;
                        pushDataSub.HASH = hash;
                        //sleep.sleep(1);

                        if (pre_fix == "P") { // Proccess
                            //console.log('pr_fix : P');
                            var val = fileinfo.taskinfo.tasklist.find(function (item) {
                                return item.sub_task_id == taskid_pfix;
                            });
                            if (val) {
                                var val1 = val.sub_info.find(function (item) {
                                    return item.OS_TYPE == os_pfix;
                                });
                                if (val1) {
                                    //val1.P.push(`${subtaskid_pfix}`);
                                    val1.P.push(pushDataSub);
                                } else {
                                    //sub_info.P.push(`${subtaskid_pfix}`);
                                    sub_info.P.push(pushDataSub);
                                    val.sub_info.push(sub_info);
                                }
                            } else {
                                //sub_info.P.push(`${subtaskid_pfix}`);
                                sub_info.P.push(pushDataSub);
                                item_info.sub_info.push(sub_info);
                                fileinfo.taskinfo.tasklist.push(item_info);
                            }


                        } else if (pre_fix == "D") { // Document
                            var val = fileinfo.taskinfo.tasklist.find(function (item) {
                                return item.sub_task_id == taskid_pfix;
                            });
                            if (val) {
                                //val.D.push(`${subtaskid_pfix}`);pushDataSub
                                val.D.push(pushDataSub);
                            } else {
                                //item_info.D.push(`${subtaskid_pfix}`);
                                item_info.D.push(pushDataSub);
                                fileinfo.taskinfo.tasklist.push(item_info);
                            }
                            //console.log('pr_fix : D1', item_info);
                    
                        } else if (pre_fix == "I") { // Information
                            var val = fileinfo.taskinfo.tasklist.find(function (item) {
                                return item.sub_task_id == taskid_pfix;
                            });
                            if (val) {
                                //val.I.push(`${subtaskid_pfix}`);
                                val.I.push(pushDataSub);
                            } else {
                                //item_info.I.push(`${subtaskid_pfix}`);
                                item_info.I.push(pushDataSub);
                                fileinfo.taskinfo.tasklist.push(item_info);
                            }
                            //console.log('pr_fix : I1', fileinfo.taskinfo.tasklist)
                        }
                        //taskinfo.task_count += 1;
                        
                        /**
                         * OS type가 상이한 파일이 들어가는지 여부를 판단 한다
                         */
                        //console.log('OS: ', sub_info.OS_TYPE);
                        //console.log('NAME: ',pushDataSub.NAME);


                    } else {
                        console.log("there is worng OS Prefix in tasks", orgName);
                    }
                } else {
                    console.log("there is worng Project Prefix in tasks", orgName);
                }

            } //최상의 접두어는 Core 의 구분
            else if (pre_fix == "C") {
                var os_pfix = split[1]; //os 구분
                var type_pfix = split[2]; //file type
                var proj_pfix = split[3]; //프로젝트 ID
                var name_pfix = split[4]; //name
                name_pfix = orgName;
                // console.log('here: ',name_pfix);
                // Description
                // C_WIN_D_10001_Nextwork.DLL //C_OS_Type_프로젝트ID_이름

                if (obj.proj_ID == proj_pfix) {

                    if ((os_pfix.toUpperCase() == "WIN") || (os_pfix.toUpperCase() == "MAC") || (os_pfix.toUpperCase() == "LINUX")) {
                        // hash 를 생성한다
                        var item_info = new Object();
                        item_info.OS_TYPE = `${os_pfix}`;
                        item_info.PROCESSOR = new Array();
                        item_info.DLL = new Array();
                        item_info.OTHER = new Array();

                        var hash = await addFile(`${name_pfix}`, dirName + `${name_pfix}`);
                        var pushData = new Object();
                        pushData.NAME = `${name_pfix}`;
                        pushData.HASH = hash;
                        //sleep.sleep(1);

                        if (type_pfix.toUpperCase() == "P") { // Proccess
                            var val = fileinfo.coreinfo.corelist.find(function (item) {
                                return item.OS_TYPE == os_pfix;
                            });
                            if (val) {
                                val.PROCESSOR.push(pushData);
                            } else {
                                item_info.PROCESSOR.push(pushData);
                                fileinfo.coreinfo.corelist.push(item_info);
                            }
                            //console.log(dirName + `${name_pfix}`);


                        } else if (type_pfix.toUpperCase() == "D") { // DLL
                            var val = fileinfo.coreinfo.corelist.find(function (item) {
                                return item.OS_TYPE == os_pfix;
                            });
                            if (val) {
                                val.DLL.push(pushData);
                            } else {
                                item_info.DLL.push(pushData);
                                fileinfo.coreinfo.corelist.push(item_info);
                            }


                        } else if (type_pfix.toUpperCase() == "O") { // Other
                            var val = fileinfo.coreinfo.corelist.find(function (item) {
                                return item.OS_TYPE == os_pfix;
                            });
                            if (val) {
                                val.OTHER.push(pushData);
                            } else {
                                item_info.OTHER.push(pushData);
                                fileinfo.coreinfo.corelist.push(item_info);
                            }
                        } else {
                            console.log("there is worng type Prefix in tasks", orgName);
                        }
                    
                    } else {
                        console.log("there is worng OS Prefix in tasks", orgName);
                    }

                } else {
                    console.log("there is worng Project Prefix in core", orgName);
                }
            } else {
                console.log("there is worng Prefix", orgName);
            }
            

            // 업로드된 모든파일를 삭제한다
            fs.unlink(filePath, (err) => {
                if (err) console.log(err);
            });

        } //endfor 파일갯수만큼
    } // endif 업로드 파일존재 여부


    // Core 영역 ipfs 담기 code 
    // 최종 구조체 만들기
    var c_cnt = 0;
    for (var i = 0; i < fileinfo.coreinfo.corelist.length; i++) {
        if (fileinfo.coreinfo.corelist[i]['OS_TYPE'] == 'LINUX') {
            var re_data = '';
            var core_re_obj = new Object();
            core_re_obj.core_type = new Array();
            core_re_obj.core_addr = new Array();
            core_re_obj.core_CRC = new Array();
            // 리눅스 일경우 처리된 json 구조를 ipfs 버퍼에 담아 hash 발생
            re_data = fileinfo.coreinfo.corelist[i];
            core_re_obj.core_type = re_data.OS_TYPE;
            core_re_obj.core_addr = await addData(re_data);
            core_re_obj.core_CRC = '0x12345678'; // 수정해야하는 영역
            obj.Core_Process.push(core_re_obj);
            c_cnt += 1; 
        } else if (fileinfo.coreinfo.corelist[i]['OS_TYPE'] == 'MAC') {
            var re_data = '';
            var core_re_obj = new Object();
            core_re_obj.core_type = new Array();
            core_re_obj.core_addr = new Array();
            core_re_obj.core_CRC = new Array();
            // 리눅스 일경우 처리된 json 구조를 ipfs 버퍼에 담아 hash 발생
            re_data = fileinfo.coreinfo.corelist[i];
            core_re_obj.core_type = re_data.OS_TYPE;
            core_re_obj.core_addr = await addData(re_data);
            core_re_obj.core_CRC = '0x11223344'; // 수정해야하는 영역
            obj.Core_Process.push(core_re_obj);
            c_cnt += 1; 
        } else if (fileinfo.coreinfo.corelist[i]['OS_TYPE'] == 'WIN') {
            var re_data = '';
            var core_re_obj = new Object();
            core_re_obj.core_type = new Array();
            core_re_obj.core_addr = new Array();
            core_re_obj.core_CRC = new Array();
            // 리눅스 일경우 처리된 json 구조를 ipfs 버퍼에 담아 hash 발생
            re_data = fileinfo.coreinfo.corelist[i];
            //console.log('debug: ', re_data);
            core_re_obj.core_type = re_data.OS_TYPE;
            core_re_obj.core_addr = await addData(re_data);
            core_re_obj.core_CRC = '0x87654321'; // 수정해야하는 영역
            obj.Core_Process.push(core_re_obj);
            c_cnt += 1; 
        }
    }
    // Core 의 OS별 처리된 갯수를 업데이트 한다
    obj.core_count = c_cnt;
    
    // Credite 를 Task 별로 분배하여 value를 담는다
    var task_value = obj.credit / fileinfo.taskinfo.tasklist.length;
    //console.log( parseFloat(task_value.toFixed(2)) );

    // Task ipfs 담기 코드
    var allList = new Array();
    for (var k=0; k < fileinfo.taskinfo.tasklist.length; k++) {
        var obj_info = new Object();
        var obj_data = new Object();
        var list = new Object(); // Task Sub List
            list.node_quid = 'node';
            list.sub_task_id = fileinfo.taskinfo.tasklist[k].sub_task_id;
            list.process_name = 'TASK_' + fileinfo.taskinfo.tasklist[k].sub_task_id;
            list.value = parseFloat(task_value.toFixed(2));
            list.status = 'NONE';
            list.OS = [];
            list.para_info_loca = '';
            list.para_CRC = '';
            list.data_loca = '';
            list.cre_date = CurrentTime;
            list.time_unit = 'm';
            list.work_time = '20';
            obj_info = {
                I: fileinfo.taskinfo.tasklist[k].I
            }
            obj_data = {
                D: fileinfo.taskinfo.tasklist[k].D
            }
            list.para_info_loca = await addData(obj_info); // Info
            list.para_CRC = '0x22222222';
            list.data_loca = await addData(obj_data); // Data
            list.data_CRC = '0x44444444';
        allList.push(list);

        //console.log("D: ",fileinfo.taskinfo.tasklist[k].D);
        //console.log("I: ",fileinfo.taskinfo.tasklist[k].I);

        for (var z=0; z < fileinfo.taskinfo.tasklist[k].sub_info.length; z++) {
            var temp = new Object();
                temp.task_resource = fileinfo.taskinfo.tasklist[k].sub_info[z]['OS_TYPE'];
                temp.process_loca = await addData(fileinfo.taskinfo.tasklist[k].sub_info[z]);
                temp.process_CRC = '0x99999999';
            list.OS[z] = temp;
            
            /**
             * OS type가 상이한 파일이 들어가는지 여부를 판단 한다
             */
            //console.log('OS: ', fileinfo.taskinfo.tasklist[k].sub_info[z]['OS_TYPE']);
            //console.log('NAME: ', fileinfo.taskinfo.tasklist[k].sub_info[z]);
        }
        
        obj.total_task_num = k + parseInt(1);


        list.value

        // 삭제예정 코드
        //obj.task_info.sub_task_process_count = k + parseInt(1);
        obj.task_info.tasknamelist.push(list);
    }


    /*
    console.log("core_info : ", fileinfo.coreinfo.corelist);
    console.log("task_info : ", fileinfo.taskinfo.tasklist[0]);
    console.log("task_info : ", fileinfo.taskinfo.tasklist[1]);
    console.log("sub_info : ", JSON.stringify(fileinfo.taskinfo.tasklist[0].sub_info));
    console.log("sub_info : ", JSON.stringify(fileinfo.taskinfo.tasklist[1].sub_info));
    */

    //console.log('==================================================================');
    //console.log('end: ', JSON.stringify(obj));

    var filename = '';
    if (req.body.msg_type) {
        filename = req.body.proj_name + '_' + req.body.proj_id + '.json';
    } else {
        filename = 'untitle_project.json';
    }
    var mimetype = 'application/json';
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-disposition','attachment; filename=' + filename);
    res.send( obj );
});
module.exports = router;


// IPFS서버 부하를 줄이고자 파일처리를 지연시킨다
function delay() {
    return new Promise(resolve => setTimeout(resolve, 300));
}


// 사용자 함수 설정
// IPFS 파일저장
const addFile = async (fileName, filePath) => {
    try{
        ipfs = ipfsClient(full_address);
        await delay(); //파일 등록을 지연한다
        const file = fs.readFileSync(filePath);
        const fileAdded = await ipfs.add({
            path: fileName,
            content: file
        });
        const fileHash = fileAdded.cid.string;

        return fileHash;
    } catch(error){
        console.log("Upload Faile(" + fileName + "): ", error);
    }
}

// IPFS 버퍼저장
const addData = async (data) => {
    try{
        await delay(); //정보 저장을 지연한다
        const json_str = JSON.stringify(data);
        const Added = await ipfs.add(Buffer.from(json_str));
        const Hash = Added.cid.string;

        return Hash;
    } catch(error){
        console.log("Data Faile(" + data + "): ", error);
    }
}