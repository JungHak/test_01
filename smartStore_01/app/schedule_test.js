const schedule = require('node-schedule');
const axios = require('axios'); // HTTP 요청을 위한 axios 불러오기
const job = schedule.scheduleJob('*/6 * * * * *', async function() {
    //console.clear();

    try {
        // Node.js에서 해당 URL로 GET 요청을 보냅니다.
        const response = await axios.get('http://localhost:3000/test_fn', { timeout: 5000 });
        console.log('요청 성공:', response.status);
    } catch (error) {
        console.error('요청 실패:', error.message);
    }
});



// 매주 매분 1분마다 실행;* * * * * 순서로 분, 시, 일, 월, 요일
//const job = schedule.scheduleJob('*/1 * * * *', function() {
//    console.clear();
//    const now = new Date();
//    const kstString = now.toLocaleString("ko-KR", {
//    timeZone: "Asia/Seoul"
//    });
//    console.log('');
//    console.log('1분마다 ▶▶▶▶▶▶▶▶ ●■▶◆ ',kstString);
//
//
//    var cur_date = new Date(); // 현재 날짜 및 시간 생성
//    var pre_date = new Date(); // 현재 날짜 및 시간 생성
//    cur_date.setDate(cur_date.getDate() - 0); // 1일을 뺌
//    pre_date.setDate(cur_date.getDate() - Number('1')); // 1일을 뺌
//
//    var pre_date_str=format_date('yyyy-mm-dd',pre_date)
//    var cur_date_str=format_date('yyyy-mm-dd',cur_date)
//
//
//    console.log('1분마다 ▶▶▶▶▶▶▶▶ ●■▶◆ ',format_date('yyyy-mm-dd',pre_date),' ::: ',format_date('yyyy-mm-dd',cur_date));
//
//
//    var { update_last } = require('../common');
//    //var r_val=await update_last('update_last', pre_date_str,cur_date_str,'','500')
//
//
//    function format_date(p_type,dd)
//    {
//        if (p_type=='yyyy-mm-dd'){
//            var year = dd.getFullYear();
//            var month = (dd.getMonth() + 1).toString().padStart(2, '0'); 
//            var day =dd.getDate().toString().padStart(2, '0');
//            return `${year}-${month}-${day}`;
//        }
//    }
//
//
//
//});
//

//
//const job = schedule.scheduleJob('1 0 * * *', function() {
//  console.log('매 0시 1분에 ');
//});
//
