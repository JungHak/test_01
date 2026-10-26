
const {
fetchAndSaveAllProducts,
fetchAndSaveAllProducts9,
check_api,
update_last,
update_order_prod,
get_order_prod,
test_fn
} = require('./common');

/*
// common. 을 붙이지 않고 바로 사용할 수 있습니다.
console.log(siteName);         // 출력: everstudy.com
console.log(add(5, 5));        // 출력: 10
console.log(sayHello('이순신')); // 출력: 안녕하세요, 이순신님!

C:\nodejsApp\smartStore_01\api2all.js
fetchAndSaveAllProducts('regiFromTo','2026-09-30','2026-10-30','','10')
fetchAndSaveAllProducts('regiToNow','-1','','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('modiFromTo','2026-30-29','2026-09-29','','10')
fetchAndSaveAllProducts('modiToNow','0','','','10')

update_last('update_last', '2026-10-01','2026-10-01','','500')
update_last('update_last', '2026-10-01','2026-10-02','','500')
update_order_prod('update_order_prod',[12911067156,12844062011],'','','')

*/

var ttt=get_order_prod('get_order_prod','2026-10-13T00:00:00.000+09:00','2026-10-13T23:59:59.000+09:00','PAYED_DATETIME','')






