
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

cd C:\nodejsApp\smartStore_01
nodemon server.js

node test_fn.js



C:\nodejsApp\smartStore_01\api2all.js
fetchAndSaveAllProducts('regiFromTo','2026-09-30','2026-10-30','','10')
fetchAndSaveAllProducts('regiToNow','-1','','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('modiFromTo','2026-30-29','2026-09-29','','10')
fetchAndSaveAllProducts('modiToNow','0','','','10')

update_last('update_last', '2026-10-01','2026-10-01','','500')
update_last('update_last', '2026-10-01','2026-10-02','','500')
update_order_prod('update_order_prod',[12911067156,12844062011],'','','')

*/


// 실제 실행 부분 (반드시 async 함수 내부여야 await를 쓸 수 있습니다)

async function main() {

    try {

        /// 1번
        const result = await test_fn('p_mode','p_1','p_2','p_3');

        console.log(result.yn);
        console.log(result);

//        /// 2번
//        test_fn().then(result => {
//          console.log(result);
//        });


    } catch (error) {
        console.error(error);
    }
}

main();


