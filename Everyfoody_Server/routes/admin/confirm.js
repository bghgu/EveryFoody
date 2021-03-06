const async = require('async');
const mysql = require('mysql');
const moment = require('moment');
const pool = require('../../config/db_pool');
const express = require('express');
const router = express.Router();
const fcm = require('../../config/fcm_config');
const code = require('../../modules/statuscode');

router.get('/:location/:ownerID', (req, res) => {

  let taskArray = [
    (callback) => {
      pool.getConnection((err, connection) => {
        if (err) callback("DB connection error :" + err, null);
        else callback(null, connection)
      });
    },
    (connection, callback) => {
      let updateOwnerQuery = 'update users set user_status = ? where user_id = ?';
      connection.query(updateOwnerQuery, [code.AuthOwner, req.params.ownerID], (err) => {
        if (err) {
          connection.release();
          callback("update owner status query error : " + err, null);
        } else {
          callback(null, connection, "successful update owner status");
        }
      });
    },
    (connection, successMSG, callback) => {
      let selectDeviceTokenQuery = 'select user_deviceToken from users where user_id = ?';
      connection.query(selectDeviceTokenQuery, req.params.ownerID, (err, token) => {
        if (err) {
          connection.release();
          callback('select device token query error : ' + err);
        } else {
          callback(null, connection, successMSG, token[0].user_deviceToken);
        }
      });
    },
    (connection, successMSG, deviceToken, callback) => {
      let updateLocationQuery = 'update owners set owner_location = ? where owner_id = ?';
      connection.query(updateLocationQuery, [req.params.location, req.params.ownerID], (err) => {
        if(err){
          connection.release();
          callback('update location query error : '+ err, null);
        } else {
          callback(null, connection, successMSG, deviceToken);
        }
      });
    },
    (connection, successMSG, deviceToken, callback) => {
      let message = {
        to: deviceToken,
        collapse_key: 'Updates Available',
        data: {
          title: "가게 인증 완료 알림",
          body: "가게 인증이 완료되었습니다! 가게 상세정보를 입력해주세요!"
        }
      };
      fcm.send(message, (err, response) => {
        if (err) {
          connection.release();
          callback(successMSG + " // send push msg error : " + err, null);
        } else {
          connection.release();
          callback(null, successMSG + " // success send push msg : " + response);
        }
      });
    }
  ];
  async.waterfall(taskArray, (err, result) => {
    if (err) {
      err = moment().format('MM/DDahh:mm:ss// ') + err;
      console.log(err);
    } else {
      result = moment().format('MM/DDahh:mm:ss// ') + result;
      console.log(result);
    }
  });
});

module.exports = router;