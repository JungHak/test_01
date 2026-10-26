
const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // URL-encoded 데이터용 (예: 일반 HTML)



// 네이버 커머스 API 설정값 (본인의 정보로 변경하세요)
const CLIENT_ID = "1dSQ78zEFInNdGfMcDuYGT"
const CLIENT_SECRET = "$2a$04$8q2d/jYXB58kTNVMSiLefe"

app.get('/get-token', async (req, res) => {
    try {
        // 1. 현재 타임스탬프 생성 (밀리초 단위)
        const timestamp = Date.now();

        // 2. 비밀번호(Client ID + "_" + Timestamp)와 솔트(Client Secret) 결합 및 Bcrypt 해싱
        // 스마트스토어 API는 비밀번호 자리에 password를, 솔트 자리에 clientSecret을 매핑하여 해싱합니다.
        const password = `${CLIENT_ID}_${timestamp}`;

        // bcrypt.hashSync를 이용한 서명(client_secret_sign) 생성
        const hashed = bcrypt.hashSync(password, CLIENT_SECRET);

        // 생성된 해시값을 Base64 인코딩
        const client_secret_sign = Buffer.from(hashed).toString('base64');

        // 3. 네이버 커머스 API에 토큰 요청 전송 ####################################
        const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            timestamp: timestamp.toString(),
            client_secret_sign: client_secret_sign,
            type: 'SELF' // 서비스 타입에 따라 'SELF' 또는 'PARTNER'
        });

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // 4. 발급된 access_token을 Classic ASP로 반환
        res.json({
            success: true,
            access_token: response.data.access_token,
            expires_in: response.data.expires_in
        });

    } catch (error) {
        console.error('토큰 발급 실패:', error.response ? error.response.data : error.message);
        res.status(500).json({
            success: false,
            error: error.response ? error.response.data : error.message
        });
    }
});


app.get('/change_prod', async (req, res) => {
    try {
        var { fetchAndSaveAllProducts} = require('./common');
        var r_val=await fetchAndSaveAllProducts('modiToNow','-1','','','100')

        res.json({
            success: true,
            access_token: "성공"
        });

    } catch (error) {
        console.error('토큰 발급 실패:');
    }
});

// POST 방식으로 변경
app.post('/check_api', async (req, res) => {
    try {

        // req.body에서 꺼내어 변수에 할당합니다.
        //const size = req.body.size;

        const { p_mode,p_page_size, fromDate,toDate } = req.body;
        console.log(`여기 실행■■■■`);

        //const prodName = req.body.prodName;

        // GET 방식의 req.query 대신 req.body를 사용하여 데이터를 가져옵니다.
        // 구조 분해 할당(Destructuring)을 쓰면 더 깔끔합니다.
        // const { prodId, prodName } = req.body;

//        console.log(`상품 ID: ${prodId}, 상품명: ${prodName}`);
//        res.send('데이터 수신 완료');

        // 비동기 처리 로직 수행 (예: DB 수정 등)
        // const result = await updateProduct(prodId, prodName);
        var { check_api } = require('./common');
        //var r_val=await check_api(p_mode, fromDate,toDate,'',p_page_size)
        var r_val=await check_api('check_api','','','','')
        //res.status(200).json({ val:r_val });
        res.status(200).json(r_val); ////문자열만 넘겨도 된다
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST 방식으로 변경
app.post('/update_last', async (req, res) => {
    try {

        console.log(`여기 실행■■■`);
        // req.body에서 꺼내어 변수에 할당합니다.
        //const size = req.body.size;


        //const { p_mode, fromDate,toDate,p_page_size } = req.body;

        //const prodName = req.body.prodName;

        // GET 방식의 req.query 대신 req.body를 사용하여 데이터를 가져옵니다.
        // 구조 분해 할당(Destructuring)을 쓰면 더 깔끔합니다.
        // const { prodId, prodName } = req.body;

//        console.log(`상품 ID: ${prodId}, 상품명: ${prodName}`);
//        res.send('데이터 수신 완료');

        // 비동기 처리 로직 수행 (예: DB 수정 등)
        // const result = await updateProduct(prodId, prodName);
        var { update_last } = require('./common');
        var r_val=await update_last('update_last','','','')
        //res.status(200).json({ val:r_val });
        //res.status(200).json({ val:r_val });
        res.status(200).json(r_val); ////문자열만 넘겨도 된다
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST 방식으로 변경
app.post('/get_order_prod', async (req, res) => {
    try {

        console.log(`여기 실행■■■`);


        //const { p_mode, p_1,p_2,p_3} = req.body;

        //const prodName = req.body.prodName;

        // GET 방식의 req.query 대신 req.body를 사용하여 데이터를 가져옵니다.
        // 구조 분해 할당(Destructuring)을 쓰면 더 깔끔합니다.
        // const { prodId, prodName } = req.body;

//        console.log(`상품 ID: ${prodId}, 상품명: ${prodName}`);
//        res.send('데이터 수신 완료');

        // 비동기 처리 로직 수행 (예: DB 수정 등)
        // const result = await updateProduct(prodId, prodName);
        var { update_last,get_order_prod } = require('./common');

        var r_val1=await update_last('update_last','','','')

        var r_val2=await get_order_prod('get_order_prod','','','')
        //res.status(200).json({ val:r_val });
        //res.status(200).json({ val:r_val });
        res.status(200).json(r_val2); ////문자열만 넘겨도 된다
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});




// POST 방식으로 변경
app.post('/apply_today2', async (req, res) => {
    try {

        console.clear();
        console.log(`여기 실행■■■`);
        // req.body에서 꺼내어 변수에 할당합니다.
        //const size = req.body.size;
        console.log(req.body);
        const { p_mode, p_1,p_2 } = req.body;
//        const array = JSON.parse(p_1);
        console.log("■■■■■■■■■■■■■■■■■■■■■■■■");
        //console.log(p_1);

//        const p_1_arr = JSON.parse('['+p_1+']');

        const p_1_arr = p_1;
        //return p_1_arr;


        //console.log(array);
        //console.log(array[0].originProductNos); // [10195203486] 출력

        //const prodName = req.body.prodName;

        // GET 방식의 req.query 대신 req.body를 사용하여 데이터를 가져옵니다.
        // 구조 분해 할당(Destructuring)을 쓰면 더 깔끔합니다.
        // const { prodId, prodName } = req.body;

//        console.log(`상품 ID: ${prodId}, 상품명: ${prodName}`);
//        res.send('데이터 수신 완료');

        // 비동기 처리 로직 수행 (예: DB 수정 등)
        // const result = await updateProduct(prodId, prodName);
        var { apply_today2 } = require('./common');
        var r_val=await apply_today2(p_mode, p_1_arr,p_2)
        //res.status(200).json({ val:r_val });
        //res.status(200).json({ val:r_val });
        //res.status(200).json(r_val); ////문자열만 넘겨도 된다
        res.status(200).json(r_val); ////문자열만 넘겨도 된다
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});




app.post('/test_fn', async (req, res) => {
    try {
        const { p_mode, p_1, p_2, p_3 } = req.body;
        var { test_fn } = require('./common');
        var r_val=await test_fn('test_fn','p_1','22222','333333')
        res.status(200).json(r_val); ////문자열만 넘겨도 된다

    } catch (error) {
        console.error('error test_fn');
    }
});





// 3000번 포트로 서버 실행
// 3000번 포트로 서버 실행
app.listen(3000, () => {
    console.log('◆스마트스토어 토큰 발급 릴레이 서버가 3000번 포트에서 작동 중입니다.');
    console.log('◆',getCurrentDateTime());

});

function getCurrentDateTime() {

  // 현재 날짜 시간 구하기
  const now = new Date();

  // 년
  const year = now.getFullYear();
  // 월
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  // 일
  const day = now.getDate().toString().padStart(2, '0');
  // 시
  const hours = now.getHours().toString().padStart(2, '0');
  // 분
  const minutes = now.getMinutes().toString().padStart(2, '0');
  // 초
  const seconds = now.getSeconds().toString().padStart(2, '0');

  //return year + month + day + hours + minutes + seconds;
  return year + '-' +  month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
}

