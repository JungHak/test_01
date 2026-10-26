const bcrypt = require('bcrypt');
const axios = require('axios');
const sql = require('mssql');
const crypto = require('crypto');

// 1. 설정 정보 (본인의 정보로 변경하세요)
//const NAVER_API_URL = 'https://api.commerce.naver.com/external/v1/products/search';
const NAVER_API_URL = 'https://api.commerce.naver.com/external';
const CLIENT_ID = "1dSQ78zEFInNdGfMcDuYGT"
const CLIENT_SECRET = "$2a$04$8q2d/jYXB58kTNVMSiLefe"

const dbConfig = {
    user: 'SANGWON',
    password: 'swdb213##^135',
    server: 'localhost',
    database: 'SANGWON',
    port: 1433,
    options: {
        encrypt: false, // 로컬 환경이고 인증서가 없다면 false로 설정해 볼 수도 있습니다.
        trustServerCertificate: true, // 자체 서명된 인증서 허용
        cryptoCredentialsDetails: {
            minVersion: 'TLSv1'
        },
        requestTimeout: 300000 // 5분으로 증가 (밀리초 단위)
    }
};

function formatDate(date) {
/*
날자형식
예: 2026-09-26 09:32:00
const now = new Date();
console.log(formatDate(now)); // 예: 2026-09-26 09:32:00
const result = str.substring(0, 16); // 0번째부터 16글자
date.setDate(date.getDate() - 1)

const date = new Date(); // 현재 날짜 및 시간 생성
date.setDate(date.getDate() - 1); // 1일을 뺌
console.log(date0

*/
  const pad = (number) => String(number).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // 월은 0부터 시작하므로 1을 더함
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


/*
02,16일 일자를 배열에 넣기
*/
async function getAllTargetDates() {
  const result = [];
  const startDate = new Date('2023-01-02');

  // 오늘 이후 1달 뒤 마감일 계산
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();

    [2, 16].forEach(day => {
      const targetDate = new Date(year, month, day);

      // 2023-01-02부터 오늘 이후 1달 뒤까지의 모든 날짜 저장
      if (targetDate >= startDate && targetDate <= endDate) {
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');

        result.push(`${yyyy}-${mm}-${dd}`);
      }
    });

    current.setMonth(current.getMonth() + 1);
  }

  return result;
}


// 2. 기간 쌍 배열로 변환하는 함수
async function convertToDateRanges(dates) {
  const ranges = [];

  for (let i = 0; i < dates.length - 1; i++) {
    const startDateStr = dates[i];
    const nextDateStr = dates[i + 1];

    // 다음 날짜의 '하루 전날'을 계산하기 위해 Date 객체로 변환
    const nextDate = new Date(nextDateStr);
    nextDate.setDate(nextDate.getDate() - 1); // 하루를 뺍니다.

    // YYYY-MM-DD 형식으로 포맷팅
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    const endDateStr = `${yyyy}-${mm}-${dd}`;

    // [시작일, 종료일] 형태로 배열에 추가
    ranges.push([startDateStr, endDateStr]);
  }

  return ranges;
}





// 2. 네이버 커머스 API - Access Token 발급 함수
async function getAccessToken() {
    try {
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

        return response.data.access_token;

    } catch (error) {
        console.error('토큰 발급 실패:', error.response ? error.response.data : error.message);
        throw error;
    }
}


// 4. 네이버 커머스 API - 상품 상세 가져오기 함수
async function getProdDtl(accessToken,p_originProductNo) {
    var apiUrl2 = "https://api.commerce.naver.com/external/v2/products/origin-products/"+p_originProductNo
    try {
            const response = await axios.get(apiUrl2, {
                // 1. 헤더 설정
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json;charset=UTF-8;'
                },
                // 2. 필요 시 쿼리 파라미터도 함께 전달 가능
                params: {
                    period: 'weekly'
                }
            });

        // 응답 구조는 네이버 API 버전에 따라 조금씩 다를 수 있으므로 console.log로 확인 필요

        var rtn_dd=response.data.originProduct
        delete rtn_dd.detailContent;                        // 상품상세 정보를 삭제;detailContent
        return rtn_dd || {};

    } catch (error) {
        console.error('상품 조회 실패:', error.response ? error.response.data : error.message);
        throw error;
    }
}



// 3. 전체 상품 조회 및 DB 저장 함수 (페이징 처리 포함)
/*
fetchAndSaveAllProducts(p_mode,p_1,p_2,p_3,p_4)

// 날자 목록기준
fetchAndSaveAllProducts('regi','2026-09-30','1','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('regiFromTo','2026-09-30','2026-10-30','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('regiToNow','-1','','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10

fetchAndSaveAllProducts('modiFromTo','2026-09-29','2026-09-29','','10')
fetchAndSaveAllProducts('modiToNow','-1','','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10


*/
async function fetchAndSaveAllProducts(p_mode,p_1,p_2,p_3,p_4) {
    let pool;
    var prodDtl;
    var query
    try {
        console.clear();
        // DB 연결
        pool = await sql.connect(dbConfig);
        console.log('DB 연결 성공');

        // Access Token 가져오기
        const accessToken = await getAccessToken();
        console.log('Access Token 발급 성공');

        let page = 1;         // 시작 페이지
        var page_size = p_4;     // 한 페이지당 가져올 상품 수 (최대 500)
        let hasMore = true;   // 반복문 종료 조건 플래그
        totalSaved = 0;   // 저장된 총 상품 수 카운트


        let dateArray = [];

        dateArray = await getAllTargetDates();
        // 배열 맨 앞에 2020-08-02와 2022-08-02를 순서대로 추가
        dateArray.unshift('2020-08-02', '2022-08-02');

        var dateRanges = await convertToDateRanges(dateArray);
        //console.log(dateRanges);


        query = `
            SELECT TOP 1 [regDate]
            FROM [T_BOOK_SS_BK]
            WHERE [DATE_GROUP] = '0000-00-00'
            ORDER BY regDate DESC
        `;

        query = `
            SELECT TOP 1 [regDate]
            FROM [T_BOOK_SS_ORG]
            ORDER BY regDate DESC
        `;


        const resultLast = await pool.request().query(query);
        const bookList = resultLast.recordset;

        var v_regDate,start_idx
        start_idx=0
        // 데이터가 존재할 경우 시작 날짜(sDt) 업데이트
        if (bookList.length > 0) {
            const row = bookList[0];
            v_regDate=row.regDate.substring(0, 10)
        }
/*
fetchAndSaveAllProducts('regi','2026-09-30','1','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('regiFromTo','2026-09-30','2026-10-30','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('regiToNow','-1','','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10

*/

        ////########################################

        var save_list_num
        if (p_mode =='regi'){
            v_regDate=p_1  ////마지막 입력일;수동설정
            save_list_num=p_3            // 2인 경우 한달;15일 두개

            //// 시작 구간 찾기; 마지막 등록일자 이후
            for (let idx = 0; idx < dateRanges.length; idx++) {
                const [start, end] = dateRanges[idx];
                if (v_regDate >= start && v_regDate <= end){
                    //start_idx=idx+1     ////다음 목록에서부터
                    start_idx=idx
                    break;
                }
            }
            console.log('v_regDate 성공==',v_regDate,' start_idx:',start_idx);
            //return;

        }
        else if (p_mode =='regiFromTo'){


            dateRanges = [];
            dateRanges.push([p_1, p_2]);
            save_list_num=1
            start_idx=0


        }
        else if (p_mode =='regiToNow'){
            var cur_date = new Date(); // 현재 날짜 및 시간 생성
            var pre_date = new Date(); // 현재 날짜 및 시간 생성
            cur_date.setDate(cur_date.getDate() - 0); // 1일을 뺌
            pre_date.setDate(cur_date.getDate() + Number(p_1)); // 1일을 뺌

            dateRanges = [];
            dateRanges.push([formatDate(pre_date).substring(0, 10), formatDate(cur_date).substring(0, 10)]);
            save_list_num=1
            start_idx=0
            console.log(dateRanges);
        }


        else if (p_mode =='modiFromTo'){


            dateRanges = [];
            dateRanges.push([p_1, p_2]);
            save_list_num=1
            start_idx=0


        }
        else if (p_mode =='modiToNow'){
            var cur_date = new Date(); // 현재 날짜 및 시간 생성
            var pre_date = new Date(); // 현재 날짜 및 시간 생성
            cur_date.setDate(cur_date.getDate() - 0); // 1일을 뺌
            pre_date.setDate(cur_date.getDate() + Number(p_1)); // 1일을 뺌

            dateRanges = [];
            dateRanges.push([formatDate(pre_date).substring(0, 10), formatDate(cur_date).substring(0, 10)]);
            save_list_num=1
            start_idx=0
            console.log(dateRanges);
        }

        else {
            v_regDate=p_1  ////마지막 입력일;수동설정
        }


        ////########################################

        var nn=0

        ////기간동안 루프
        for (let idx = start_idx; idx < dateRanges.length; idx++) {
        const [start, end] = dateRanges[idx];

            if (idx >= start_idx+save_list_num){
                hasMore = false;
                break;
                //return true 는 break
                //return true;
            }

            hasMore = true;   // 반복문 종료 조건 플래그
            totalSaved_sub=0
            if (nn==0){
                console.log(`▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶ `);
            }
            console.log(`▶ ${idx + 1}번째 기간: 시작일은 ${start}이고, 종료일은 ${end}입니다.`);
            console.log(`hasMore::${hasMore}`);

            //if (idx==0){
            if (nn==0){
                query = `
                    delete aa
                    FROM [T_BOOK_SS_BK] aa
                    WHERE
                    [DATE_GROUP]='0000-00-00';
                `;

                const result2 = await pool.request().query(query);
            }
            nn++;


            page = 1;         // 시작 페이지

            while (hasMore) {

                var requestBody

                console.log(`[${page} 페이지] 상품 요청 중...`);

                // 네이버 API 요청 바디 설정

                if (p_mode =='modiFromTo'){
                    var requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_MOD_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "MOD_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };

                }
                else if (p_mode =='modiToNow'){
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_MOD_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "MOD_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                }

                else {
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_REG_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "REG_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                }


                 const response = await axios.post(
                     `${NAVER_API_URL}/v1/products/search`,
                     requestBody,
                     {
                         headers: {
                             'Authorization': `Bearer ${accessToken}`,
                             'Content-Type': 'application/json'
                         }
                     }
                 );


                const data = response.data;
                const products = data.contents || [];
                const totalElements = data.totalElements || 0; // 전체 상품 개수

                console.log(`[${page} 페이지] 받아온 상품 수: ${products.length}개 / 전체 상품 수: ${totalElements}개`);

                // 데이터가 없으면 루프 탈출
                if (products.length === 0) {
                    console.log('더 이상 가져올 상품이 없습니다.');
                    hasMore = false;
                    break;
                }

                /*
                var MEMO = JSON.stringify(products);

                var query = `
                INSERT INTO T_NNN
                (MEMO)
                VALUES
                (@MEMO)
                `;
                await pool.request()
                    .input('MEMO', sql.NVarChar, MEMO)
                    .query(query);
                */

                var valueLines = [];

                // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
                if (products.length > 0) {
                    for (var prod of products) {

                        var LIST_INFO = JSON.stringify(prod);
                        LIST_INFO = LIST_INFO.replace(/'/g, "''");
                        var DETAIL_INFO=""
                        var originProductNo = String(prod.channelProducts[0].originProductNo);
                        var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);
                        var regDate = String(prod.channelProducts[0].regDate);
                        var modifiedDate = String(prod.channelProducts[0].modifiedDate);


                        var todayStockQuantity="";

                        //if (deliveryAttributeType=='TODAY'){
                        if (deliveryAttributeType!='TODAYxxxxxx'){
                            /*
                            prodDtl=await getProdDtl(accessToken,originProductNo)
                            todayStockQuantity=prodDtl.deliveryInfo.todayStockQuantity
                            //console.log(`prodDtl ▶ ${prodDtl.toString()}`);
                            */
                            DETAIL_INFO=await getProdDtl(accessToken,originProductNo)
                            DETAIL_INFO = JSON.stringify(DETAIL_INFO);
                            DETAIL_INFO = DETAIL_INFO.replace(/'/g, "''");

                            await new Promise(resolve => setTimeout(resolve,1000));
                        }

                        // SQL 쿼리에 직접 들어갈 수 있도록 괄호 ()와 홑따옴표 ''로 감싸줍니다.
                        // 데이터 내부에 혹시 모를 홑따옴표(')가 있다면 두개('')로 치환해 에러를 방지합니다.
                        const originProductNo2 = originProductNo.replace(/'/g, "''");
                        const deliveryAttributeType2 = deliveryAttributeType.replace(/'/g, "''");
                        valueLines.push(`('0000-00-00','${originProductNo}','${deliveryAttributeType}','${LIST_INFO}','${DETAIL_INFO}','${regDate}','${modifiedDate}')`);


                    }
                }


                // 저장할 데이터가 있을 때만 DB 요청을 보냅니다.
                if (valueLines.length > 0) {
                    query = `
                        INSERT INTO [T_BOOK_SS_BK](
                            [DATE_GROUP]
                            ,[originProductNo]
                            ,[deliveryAttributeType]
                            ,[LIST_INFO]
                            ,[DETAIL_INFO]
                            ,[regDate]
                            ,[modifiedDate])
                        VALUES
                        ${valueLines.join(',\n')}
                    `;

                    const result = await pool.request().query(query);

                    totalSaved += products.length;
                    totalSaved_sub += products.length;

                    console.log(`[${page} 페이지] DB 저장 완료. 현재까지 누적 저장: ${totalSaved}개`);
                }

                // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
                if (totalSaved_sub >= totalElements) {
                    hasMore = false;
                    console.log('모든 상품을 성공적으로 가져와 저장했습니다.');
//                } else {
//                    page++; // 다음 페이지 준비
//
//                    // API 과도한 호출 제한(Rate Limit)을 피하기 위해 안전하게 0.2초 정도 쉬어줍니다.
                }


                await new Promise(resolve => setTimeout(resolve,1000));
                page++; // 다음 페이지 준비

    //            if (page >= 2) {
    //                hasMore = false;
    //            }


            } /////while (hasMore) {
        }


        ////
        query = `
            MERGE INTO [T_BOOK_SS_ORG] AS T -- 데이터를 적용할 대상
            USING [T_BOOK_SS_BK] AS S     -- 비교할 원본 데이터
            ON T.[originProductNo] = S.[originProductNo]          -- 조인 조건 (일치 여부 확인)
            AND S.[DATE_GROUP]='0000-00-00'
            -- 조건에 일치할 때 (데이터가 있는 경우)
            WHEN MATCHED THEN
                UPDATE SET
                 T.[deliveryAttributeType] =S.[deliveryAttributeType]
                ,T.[LIST_INFO]             =S.[LIST_INFO]
                ,T.[DETAIL_INFO]           =S.[DETAIL_INFO]
                ,T.[regDate]               =S.[regDate]
                ,T.[modifiedDate]          =S.[modifiedDate]
            -- 조건에 일치하지 않을 때 (대상에 데이터가 없는 경우)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
            		 [originProductNo]
             		,[deliveryAttributeType]
            		,[LIST_INFO]
            		,[DETAIL_INFO]
            		,[regDate]
            		,[modifiedDate]
            	) VALUES (
            		 S.[originProductNo]
            		,S.[deliveryAttributeType]
            		,S.[LIST_INFO]
            		,S.[DETAIL_INFO]
            		,S.[regDate]
            		,S.[modifiedDate]
            	);
        `;

        const result = await pool.request().query(query);


    } catch (error) {
        console.error('작업 중 오류 발생:', error.response ? error.response.data : error.message);
    } finally {
        if (pool) {
            await pool.close();
            console.log('DB 연결 종료');
        }
    }
}


//■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙

async function update_last(p_mode,p_1,p_2,p_3,p_4) {
/*

update_last('update_last','2026-10-02','2026-10-06','','500')

v_now=now()-4
today_date=left(v_now,10)
SDATE=today_date

v_now=now()
today_date=left(v_now,10)
EDATE=today_date

p_page_size="500"

*/

    let pool;
    var prodDtl;
    var query
    var totalCnt=0

    try {
        console.clear();
        // DB 연결
        pool = await sql.connect(dbConfig);
        console.log('DB 연결 성공');

        // Access Token 가져오기
        const accessToken = await getAccessToken();
        console.log('Access Token 발급 성공');

        let page = 1;         // 시작 페이지
        var page_size = p_4;     // 한 페이지당 가져올 상품 수 (최대 500)
        let hasMore = true;   // 반복문 종료 조건 플래그
        var totalCalled = 0;   // 저장된 총 상품 수 카운트


        let dateArray = [];

        dateArray = await getAllTargetDates();
        // 배열 맨 앞에 2020-08-02와 2022-08-02를 순서대로 추가
        dateArray.unshift('2020-08-02', '2022-08-02');

        var dateRanges = await convertToDateRanges(dateArray);
        //console.log(dateRanges);


        query = `
            SELECT 'regi' p_type,AA.originProductNo,regDate apply_date
            FROM [T_BOOK_SS_ORG] AA
            where regDate > '${p_1}' and regDate < '${p_2}Z'
            union all
            Select 'modi' p_type,AA.originProductNo,modifiedDate apply_date
            FROM [T_BOOK_SS_ORG] AA
            where modifiedDate > '${p_1}' and modifiedDate < '${p_2}Z'
        `;


        const resultLast = await pool.request().query(query);
        const bookList = resultLast.recordset;

        var regi_list="XXXXXXXXX,"
        var modi_list="XXXXXXXXXX,"
        if (bookList.length > 0) {
            for (const row of bookList) {
                // 기존 코드의 row.regDate 대신 SQL에서 지정한 별칭(apply_date)을 사용해야 할 수 있습니다.
                // 만약 기존 DB 컬럼명 그대로 쓰신다면 row.regDate를 유지하되,
                // 쿼리 결과에 맞게 변수를 활용하세요.
                if (row.p_type=='regi'){
                    regi_list += row.originProductNo+'_'+row.apply_date+','
                }
                else{
                    modi_list += row.originProductNo+'_'+row.apply_date+','
                }
                //console.log(row.originProductNo, row.apply_date);

                // 예시: 각 행의 날짜를 가공하는 경우
                // const v_date = row.apply_date.substring(0, 10);
            }


        }


        var v_regDate,start_idx
        start_idx=0

/*
update_last('update_last','2026-10-01','2026-10-01','','500')    // 2026-09-30일 소속 목록 1 개, p_4:10
update_last
*/

        ////########################################

        var save_list_num
        if (p_mode =='update_last'){
            dateRanges = [];
            dateRanges.push([p_1, p_2]);
            save_list_num=1
            start_idx=0

        }


        ////########################################


        var nn=0


        //// 기간동안 루프
        //// 신규둥록
        for (let idx = start_idx; idx < dateRanges.length; idx++) {
            totalCalled=0
            totalCalled_sub=0
            var [start, end] = dateRanges[idx];

            hasMore = true;   // 반복문 종료 조건 플래그


            if (idx >= start_idx+save_list_num){
                hasMore = false;
                break;
                //return true 는 break
                //return true;
            }

            if (nn==0){
                console.log(`▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶ ${getCurrentDateTime()}ⓐ`);
            }
            console.log(`▶ ${idx + 1}번째 기간: 시작일은 ${start}이고, 종료일은 ${end}입니다.ⓐ`);
            console.log(`hasMore::${hasMore}`);

            //if (idx==0){
            if (nn==0){
                query = `
                    delete aa
                    FROM [T_BOOK_SS_BK] aa
                    WHERE
                    [DATE_GROUP]='0000-00-00';
                `;

                var result2 = await pool.request().query(query);
            }
            nn++;


            page = 1;         // 시작 페이지

            while (hasMore) {

                var requestBody

                console.log(`[${page} 페이지] 상품 요청 중ⓐ...`);

                // 네이버 API 요청 바디 설정

                if (p_mode =='update_last'){
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_REG_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "REG_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                }

                //// 도서정보 목록
                var response = await axios.post(
                    `${NAVER_API_URL}/v1/products/search`,
                    requestBody,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );


                var data = response.data;
                var products = data.contents || [];
                var totalElements = data.totalElements || 0; // 전체 상품 개수

                console.log(`[${page} 페이지] 받아온 상품 수: ${products.length}개 / 전체 상품 수: ${totalElements}개ⓐ`);

                // 데이터가 없으면 루프 탈출
                if (products.length === 0) {
                    console.log('더 이상 가져올 상품이 없습니다.');
                    hasMore = false;
                    break;
                }

                var valueLines = [];

                var cnt=0
                // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
                if (products.length > 0) {
                    totalCalled += products.length;
                    totalCalled_sub += products.length;
                    for (var prod of products) {
                        var LIST_INFO = JSON.stringify(prod);
                        LIST_INFO = LIST_INFO.replace(/'/g, "''");
                        var DETAIL_INFO=""
                        var originProductNo = String(prod.channelProducts[0].originProductNo);
                        var regDate = String(prod.channelProducts[0].regDate);
                        var modifiedDate = String(prod.channelProducts[0].modifiedDate);
                        var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);


                        var todayStockQuantity="";

                        if (regi_list.indexOf(','+originProductNo+'_'+regDate+',')==-1){
                            //// 이미 등록된 것이 없는 것만 입력한다
                            cnt++

                            //if (deliveryAttributeType=='TODAY'){
                            if (deliveryAttributeType!='TODAYxxxxxx'){
                                /*
                                prodDtl=await getProdDtl(accessToken,originProductNo)
                                todayStockQuantity=prodDtl.deliveryInfo.todayStockQuantity
                                //console.log(`prodDtl ▶ ${prodDtl.toString()}`);
                                */
                                DETAIL_INFO=await getProdDtl(accessToken,originProductNo)
                                DETAIL_INFO = JSON.stringify(DETAIL_INFO);
                                DETAIL_INFO = DETAIL_INFO.replace(/'/g, "''");

                                await new Promise(resolve => setTimeout(resolve,1000));
                            }

                            // SQL 쿼리에 직접 들어갈 수 있도록 괄호 ()와 홑따옴표 ''로 감싸줍니다.
                            // 데이터 내부에 혹시 모를 홑따옴표(')가 있다면 두개('')로 치환해 에러를 방지합니다.
                            var originProductNo2 = originProductNo.replace(/'/g, "''");
                            var deliveryAttributeType2 = deliveryAttributeType.replace(/'/g, "''");
                            valueLines.push(`('0000-00-00','${originProductNo}','${deliveryAttributeType}','${LIST_INFO}','${DETAIL_INFO}','${regDate}','${modifiedDate}')`);

                        }
                    }

                }

                console.log(`■ 적용 cnt: ${cnt}ⓐ`);
                totalCnt +=cnt

                // 저장할 데이터가 있을 때만 DB 요청을 보냅니다.
                if (valueLines.length > 0) {
                    query = `
                        INSERT INTO [T_BOOK_SS_BK](
                            [DATE_GROUP]
                            ,[originProductNo]
                            ,[deliveryAttributeType]
                            ,[LIST_INFO]
                            ,[DETAIL_INFO]
                            ,[regDate]
                            ,[modifiedDate])
                        VALUES
                        ${valueLines.join(',\n')}
                    `;

                    var result = await pool.request().query(query);
                    //console.log(`[${page} 페이지] DB 저장 완료. 현재까지 누적 저장: ${totalCalled}개`);
                    console.log(`[${page} 페이지] DB 저장 완료. 현재까지 누적 저장: ${cnt}개`);
                }

                // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
                if (totalCalled_sub >= totalElements) {
                    hasMore = false;
                }
                //console.log(`■ totalCalled_sub: ${totalCalled_sub} ■ totalElements: ${totalElements}`);
                console.log(`■ 적용: ${cnt} ■ 전체: ${totalElements}ⓐ`);

                await new Promise(resolve => setTimeout(resolve,1000));
                page++; // 다음 페이지 준비

            } /////while (hasMore) {

        }

        //// 일단 오늘 등록한 것만 적용
        query = `
            MERGE INTO [T_BOOK_SS_ORG] AS T -- 데이터를 적용할 대상
            USING [T_BOOK_SS_BK] AS S     -- 비교할 원본 데이터
            ON T.[originProductNo] = S.[originProductNo]          -- 조인 조건 (일치 여부 확인)
            AND S.[DATE_GROUP]='0000-00-00'
            -- 조건에 일치할 때 (데이터가 있는 경우)
            WHEN MATCHED THEN
                UPDATE SET
                 T.[deliveryAttributeType] =S.[deliveryAttributeType]
                ,T.[LIST_INFO]             =S.[LIST_INFO]
                ,T.[DETAIL_INFO]           =S.[DETAIL_INFO]
                ,T.[regDate]               =S.[regDate]
                ,T.[modifiedDate]          =S.[modifiedDate]
            -- 조건에 일치하지 않을 때 (대상에 데이터가 없는 경우)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
            		 [originProductNo]
            		,[deliveryAttributeType]
            		,[LIST_INFO]
            		,[DETAIL_INFO]
            		,[regDate]
            		,[modifiedDate]
            	) VALUES (
            		 S.[originProductNo]
            		,S.[deliveryAttributeType]
            		,S.[LIST_INFO]
            		,S.[DETAIL_INFO]
            		,S.[regDate]
            		,S.[modifiedDate]
            	);
        `;

        var result = await pool.request().query(query);


        //// 기간동안 루프
        //// 변경상품
        nn=0
        for (let idx = start_idx; idx < dateRanges.length; idx++) {
            totalCalled=0
            totalCalled_sub=0
            var [start, end] = dateRanges[idx];

            if (idx >= start_idx+save_list_num){
                hasMore = false;
                break;
                //return true 는 break
                //return true;
            }

            hasMore = true;   // 반복문 종료 조건 플래그
            if (nn==0){
                console.log(`▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶ ${getCurrentDateTime()}`);
            }
            console.log(`▶ ${idx + 1}번째 기간: 시작일은 ${start}이고, 종료일은 ${end}입니다.`);
            console.log(`hasMore::${hasMore}`);

            //if (idx==0){
            if (nn==0){
                query = `
                    delete aa
                    FROM [T_BOOK_SS_BK] aa
                    WHERE
                    [DATE_GROUP]='0000-00-00';
                `;

                var result2 = await pool.request().query(query);
            }
            nn++;


            page = 1;         // 시작 페이지

            while (hasMore) {

                var requestBody

                console.log(`[${page} 페이지] 상품 요청 중...`);

                // 네이버 API 요청 바디 설정

                if (p_mode =='update_last'){
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_MOD_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "MOD_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                }


                 var response = await axios.post(
                     `${NAVER_API_URL}/v1/products/search`,
                     requestBody,
                     {
                         headers: {
                             'Authorization': `Bearer ${accessToken}`,
                             'Content-Type': 'application/json'
                         }
                     }
                 );


                var data = response.data;
                var products = data.contents || [];
                var totalElements = data.totalElements || 0; // 전체 상품 개수

                console.log(`[${page} 페이지] 받아온 상품 수: ${products.length}개 / 전체 상품 수: ${totalElements}개`);

                // 데이터가 없으면 루프 탈출
                if (products.length === 0) {
                    console.log('더 이상 가져올 상품이 없습니다.');
                    hasMore = false;
                    break;
                }


                var valueLines = [];

                var cnt=0
                // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
                if (products.length > 0) {
                    totalCalled += products.length;
                    totalCalled_sub += products.length;
                    for (var prod of products) {

                        var LIST_INFO = JSON.stringify(prod);
                        LIST_INFO = LIST_INFO.replace(/'/g, "''");
                        var DETAIL_INFO=""
                        var originProductNo = String(prod.channelProducts[0].originProductNo);
                        var regDate = String(prod.channelProducts[0].regDate);
                        var modifiedDate = String(prod.channelProducts[0].modifiedDate);
                        var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);


                        var todayStockQuantity="";

                        if (modi_list.indexOf(','+originProductNo+'_'+modifiedDate+',')==-1){
                            //// 이미 변경된 것이 없는 것만 입력한다
                           cnt++

                         //if (deliveryAttributeType=='TODAY'){
                         if (deliveryAttributeType!='TODAYxxxxxx'){
                             /*
                             prodDtl=await getProdDtl(accessToken,originProductNo)
                             todayStockQuantity=prodDtl.deliveryInfo.todayStockQuantity
                             //console.log(`prodDtl ▶ ${prodDtl.toString()}`);
                             */
                             DETAIL_INFO=await getProdDtl(accessToken,originProductNo)
                             DETAIL_INFO = JSON.stringify(DETAIL_INFO);
                             DETAIL_INFO = DETAIL_INFO.replace(/'/g, "''");

                             await new Promise(resolve => setTimeout(resolve,1000));
                         }

                         // SQL 쿼리에 직접 들어갈 수 있도록 괄호 ()와 홑따옴표 ''로 감싸줍니다.
                         // 데이터 내부에 혹시 모를 홑따옴표(')가 있다면 두개('')로 치환해 에러를 방지합니다.
                         var originProductNo2 = originProductNo.replace(/'/g, "''");
                         var deliveryAttributeType2 = deliveryAttributeType.replace(/'/g, "''");
                         valueLines.push(`('0000-00-00','${originProductNo}','${deliveryAttributeType}','${LIST_INFO}','${DETAIL_INFO}','${regDate}','${modifiedDate}')`);

                        }

                    }
                }

                console.log(`■ 적용 cnt: ${cnt}`);
                totalCnt +=cnt

                // 저장할 데이터가 있을 때만 DB 요청을 보냅니다.
                if (valueLines.length > 0) {
                    query = `
                        INSERT INTO [T_BOOK_SS_BK](
                            [DATE_GROUP]
                            ,[originProductNo]
                            ,[deliveryAttributeType]
                            ,[LIST_INFO]
                            ,[DETAIL_INFO]
                            ,[regDate]
                            ,[modifiedDate])
                        VALUES
                        ${valueLines.join(',\n')}
                    `;

                    var result = await pool.request().query(query);

                    console.log(`[${page} 페이지] DB 저장 완료. 현재까지 누적 저장: ${totalCalled}개`);
                }

                // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
                if (totalCalled_sub >= totalElements) {
                    hasMore = false;
                    console.log('모든 상품을 성공적으로 가져와 저장했습니다.');
                }
                //console.log(`■ totalCalled_sub: ${totalCalled_sub} ■ totalElements: ${totalElements}`);
                console.log(`■ 적용: ${cnt} ■ 전체: ${totalElements}`);

                await new Promise(resolve => setTimeout(resolve,1000));
                page++; // 다음 페이지 준비

            } /////while (hasMore) {
        }


        //// 업데이트 한 것 다시 적용
        query = `
            MERGE INTO [T_BOOK_SS_ORG] AS T -- 데이터를 적용할 대상
            USING [T_BOOK_SS_BK] AS S     -- 비교할 원본 데이터
            ON T.[originProductNo] = S.[originProductNo]          -- 조인 조건 (일치 여부 확인)
            AND S.[DATE_GROUP]='0000-00-00'
            -- 조건에 일치할 때 (데이터가 있는 경우)
            WHEN MATCHED THEN
                UPDATE SET
                 T.[deliveryAttributeType] =S.[deliveryAttributeType]
                ,T.[LIST_INFO]             =S.[LIST_INFO]
                ,T.[DETAIL_INFO]           =S.[DETAIL_INFO]
                ,T.[regDate]               =S.[regDate]
                ,T.[modifiedDate]          =S.[modifiedDate]
            -- 조건에 일치하지 않을 때 (대상에 데이터가 없는 경우)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
            		 [originProductNo]
            		,[deliveryAttributeType]
            		,[LIST_INFO]
            		,[DETAIL_INFO]
            		,[regDate]
            		,[modifiedDate]
            	) VALUES (
            		 S.[originProductNo]
            		,S.[deliveryAttributeType]
            		,S.[LIST_INFO]
            		,S.[DETAIL_INFO]
            		,S.[regDate]
            		,S.[modifiedDate]
            	);
        `;

        var result = await pool.request().query(query);

        return "적용된 갯수: " + totalCnt;


    } catch (error) {
        console.error('작업 중 오류 발생:', error.response ? error.response.data : error.message);
        return error.message;
    } finally {
        if (pool) {
            await pool.close();
            console.log('DB 연결 종료');
        }
    }

}



/*
const prices = findValuesByKey(data, 'price');
console.log(prices); // [ 8.95, 12.99, 19.95 ]
*/
function findValuesByKey(obj, key) {
    let results = [];

    // 재귀적으로 객체를 탐색하는 내부 함수
    function search(currentObj) {
        if (!currentObj || typeof currentObj !== 'object') return;

        // 배열인 경우 각 요소를 탐색
        if (Array.isArray(currentObj)) {
            for (const item of currentObj) {
                search(item);
            }
            return;
        }

        // 객체인 경우 키 값을 확인하고 하위 객체 탐색
        for (const k in currentObj) {
            if (k === key) {
                results.push(currentObj[k]);
            }
            // 하위 속성이 객체나 배열이면 더 깊이 탐색
            if (typeof currentObj[k] === 'object') {
                search(currentObj[k]);
            }
        }
    }

    search(obj);
    return results;
}

//■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙

async function get_order_prod(p_mode,p_1,p_2,p_3,p_4) {

0
/*

get_order_prod('get_order_prod','2026-10-13T00:00:00.000+09:00','2026-10-13T23:59:59.000+09:00','PAYED_DATETIME','')

v_now=now()-4
today_date=left(v_now,10)
SDATE=today_date

v_now=now()
today_date=left(v_now,10)
EDATE=today_date

p_page_size="500"


1.

*/

    let pool;
    var prodDtl;
    var query
    var totalCnt=0


    try {
        console.clear();
        // DB 연결
        pool = await sql.connect(dbConfig);
        console.log('DB 연결 성공');

        // Access Token 가져오기
        const accessToken = await getAccessToken();
        console.log('Access Token 발급 성공');

        let page = 1;         // 시작 페이지
        var page_size = 300;     // 한 페이지당 가져올 상품 수 (최대 500)
        let hasMore = true;   // 반복문 종료 조건 플래그
        var totalCalled = 0;   // 저장된 총 상품 수 카운트


        var nn=0

        //// 기간동안 루프
        //// 신규둥록
        totalCalled=0
        totalCalled_sub=0

        hasMore = true;   // 반복문 종료 조건 플래그

        query = `
            delete aa
            FROM [T_BOOK_SS_BK] aa
            WHERE
            [DATE_GROUP]='0000-00-00';
        `;

        var result2 = await pool.request().query(query);


        var diff_day=2
        query = `
            SELECT
            	pos
            	,lastTime
            	,nowTime
            	,fromTime
            	,toTime
            from (
            	SELECT
            		pos
            		,CONVERT(VARCHAR(33), lastTime, 127)+'+09:00' lastTime
            		,nowTime
            		,REPLACE(REPLACE(CAST(CONVERT(VARCHAR(33),DATEADD(MILLISECOND,2,lastTime+(POS-1)),127) as DATETIMEOFFSET(3)),' +00','+09'),' ','T') fromTime
            		,REPLACE(REPLACE(CAST(CONVERT(VARCHAR(33),DATEADD(day,pos,lastTime),127) as DATETIMEOFFSET(3)),' +00','+09'),' ','T') toTime
            	from (
            		SELECT
            		pos
            		,(
                        SELECT
                        	CAST(CAST(REPLACE(REPLACE(
                        	case when isnull(max([modifiedDate2]),'')='' then cast(CONVERT(varchar(10), GETDATE()-${diff_day},127) as varchar)+'T00:00:00.001+09:00'
                        	else cast(DATEADD(MILLISECOND, 2, CAST(max([modifiedDate2]) AS DATETIMEOFFSET(3))) as varchar)
                        	end,' +','+'),' ','T') AS DATETIMEOFFSET(3)) as datetime) lastTime
                        FROM [T_BOOK_SS_ORG]
            		) lastTime
            		,CONVERT(VARCHAR(33), GETDATE(), 127)+'+09:00' nowTime
            		from dbo.fn_split('1,2,3,4',',') tt
            		) ttt
            ) WWW
            WHERE 1=1
            and WWW.fromTime < WWW.nowTime
            order by POS desc
        `;


        var v_fromTime,v_toTime
        const resultLast = await pool.request().query(query);
        const rs = resultLast.recordset;

        var row

        var v_originalProductId_list=""
        var v_paymentDate_list=""
        for (let idx0 = 0; idx0 < rs.length; idx0++) {
            row = rs[idx0];
            v_fromTime=row.fromTime
            v_toTime=row.toTime

            var queryParams = "?from=" + encodeURIComponent(v_fromTime)
            queryParams +="&to=" +encodeURIComponent(v_toTime)
            queryParams +="&pageSize=300"
            queryParams +="&rangeType=PAYED_DATETIME"

            var apiUrl2 = "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders"+queryParams
                    const response = await axios.get(apiUrl2, {
                        // 1. 헤더 설정
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json;charset=UTF-8;'
                            //'Accept': 'application/json;charset=utf-8;'
                        },
                        // 2. 필요 시 쿼리 파라미터도 함께 전달 가능
                        params: {
                            ttt: 'weekly'
                        }
                    });

                //var rtn_dd=response.data.originProduct
                //delete rtn_dd.detailContent;                        // 상품상세 정보를 삭제;detailContent
                var rtn_dd=response.data.data.contents || []
                //console.log('rtn_dd:', rtn_dd.data.contents || []);
                //console.log('rtn_dd:', rtn_dd);

                for (let idx = 0; idx < rtn_dd.length; idx++) {
                    if (v_originalProductId_list.indexOf(findValuesByKey(rtn_dd[idx], 'originalProductId')[0]) == -1){

                        if (idx==0 && v_originalProductId_list==''){
                            v_originalProductId_list +=findValuesByKey(rtn_dd[idx], 'originalProductId')[0]
                            v_paymentDate_list +=findValuesByKey(rtn_dd[idx], 'paymentDate')[0]
                        }
                        else{
                            v_originalProductId_list +=","+findValuesByKey(rtn_dd[idx], 'originalProductId')[0]
                            v_paymentDate_list +=","+findValuesByKey(rtn_dd[idx], 'paymentDate')[0]
                        }
                    }

                }

        }


        var v_originalProductId_list_arr = v_originalProductId_list ? v_originalProductId_list.split(",") : [];
        //var v_originalProductId_list_arr = v_originalProductId_list.split(",");
        var v_paymentDate_list_arr = v_paymentDate_list.split(",");
        // 데이터가 없으면 루프 탈출
        if (v_originalProductId_list_arr.length == 0) {
            console.log('최근 주문 상품이 없습니다.');
            return "최근 주문 상품이 없습니다"
        }

//        console.log('rs:', rs);
//        console.log('v_originalProductId_list:',v_originalProductId_list);
//        console.log('v_originalProductId_list_arr:',v_originalProductId_list_arr.length);
//




        page = 1;         // 시작 페이지

        var requestBody


        console.log(`[${page} 페이지] 상품 요청 중ⓐ...`);

        // 네이버 API 요청 바디 설정
        //// p_1_arr

        var p_1_arr = v_originalProductId_list
          .split(',')
          .map(item => parseInt(item.trim(), 10)) // 공백 제거 후 정수로 변환
          .filter(item => !isNaN(item));           // 숫자가 아닌 값(NaN) 제거



        requestBody = {
            page: 1,
            size: 500,
            searchKeywordType: "PRODUCT_NO",
            originProductNos: p_1_arr
        };

//        requestBody = {
//            page: 1,
//            size: 500,
//            searchKeywordType: "PRODUCT_NO",
//            originProductNos:[7713750560, 13234410988]
//        };
        console.log('■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■');

        console.log('requestBody:',requestBody);

        //// 도서정보 목록
        var response2 = await axios.post(
            `${NAVER_API_URL}/v1/products/search`,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json;charset=UTF-8;'
                }
            }
        );


        var data = response2.data;
        var products = data.contents || [];
        var totalElements = data.totalElements || 0; // 전체 상품 개수
        //■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙

        console.log('■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■');
        //console.log('data:▶▶▶',data);
        //console.log('products:▶▶▶',products);

        //return;

        // 데이터가 없으면 루프 탈출
        if (products.length === 0) {
            console.log('더 이상 가져올 상품이 없습니다.');
            return '더 이상 가져올 상품이 없습니다.';
        }

        var valueLines = [];

        var cnt=0
        // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
        if (products.length > 0) {
            totalCalled += products.length;
            totalCalled_sub += products.length;
            for (var prod of products) {
                if (cnt < 1000){
                    var LIST_INFO = JSON.stringify(prod);
                    LIST_INFO = LIST_INFO.replace(/'/g, "''");
                    var DETAIL_INFO=""
                    var originProductNo = String(prod.channelProducts[0].originProductNo);
                    var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);

                    var todayStockQuantity="";

                    //// 상품 상세 정보
                    DETAIL_INFO=await getProdDtl(accessToken,originProductNo)
                    DETAIL_INFO = JSON.stringify(DETAIL_INFO);
                    DETAIL_INFO = DETAIL_INFO.replace(/'/g, "''");

                    await new Promise(resolve => setTimeout(resolve,1000));

                    // SQL 쿼리에 직접 들어갈 수 있도록 괄호 ()와 홑따옴표 ''로 감싸줍니다.
                    // 데이터 내부에 혹시 모를 홑따옴표(')가 있다면 두개('')로 치환해 에러를 방지합니다.
                    var originProductNo2 = originProductNo.replace(/'/g, "''");
                    var deliveryAttributeType2 = deliveryAttributeType.replace(/'/g, "''");
                    valueLines.push(`('0000-00-00','${originProductNo}','${deliveryAttributeType}','${LIST_INFO}','${DETAIL_INFO}','','${v_paymentDate_list_arr[cnt]}')`);
                }
                cnt++
            }

        }

        console.log('cnt ▶▶▶ :',cnt);

        // 저장할 데이터가 있을 때만 DB 요청을 보냅니다.
        if (valueLines.length > 0) {
            query = `
                INSERT INTO [T_BOOK_SS_BK](
                    [DATE_GROUP]
                    ,[originProductNo]
                    ,[deliveryAttributeType]
                    ,[LIST_INFO]
                    ,[DETAIL_INFO]
                    ,[regDate]
                    ,[modifiedDate])
                VALUES
                ${valueLines.join(',\n')}
            `;

            var result = await pool.request().query(query);


            //// 일단 오늘 등록한 것만 적용
            query = `
                UPDATE T SET
                     T.[deliveryAttributeType] =S.[deliveryAttributeType]
                    ,T.[LIST_INFO]             =S.[LIST_INFO]
                    ,T.[DETAIL_INFO]           =S.[DETAIL_INFO]
                    ,T.[modifiedDate2]           =S.[modifiedDate]
                FROM [T_BOOK_SS_ORG] AS T,[T_BOOK_SS_BK] AS S
                WHERE T.[originProductNo] = S.[originProductNo]
                AND S.[DATE_GROUP]='0000-00-00'
            `;

            var result = await pool.request().query(query);


        }

        return "ok 주문 상품수:" +valueLines.length

    } catch (error) {
        console.error('작업 중 오류 발생:', error.response ? error.response.data : error.message);
        return "◀◀◀◀◀◀◀◀◀◀◀◀ error: " + error.message;
    } finally {
        if (pool) {
            await pool.close();
            console.log('◀◀◀◀◀◀◀◀◀◀◀◀ finally : ');
        }
    }

}



async function fetchAndSaveAllProducts9(p_mode,p_1,p_2,p_3,p_4) {

    let pool;
    var prodDtl;
    var query
    try {
        console.clear();
        // DB 연결
        pool = await sql.connect(dbConfig);
        console.log('DB 연결 성공');

        // Access Token 가져오기
        const accessToken = await getAccessToken();
        console.log('Access Token 발급 성공');

        let page = 1;         // 시작 페이지
        var page_size = p_4;     // 한 페이지당 가져올 상품 수 (최대 500)
        let hasMore = true;   // 반복문 종료 조건 플래그
        totalSaved = 0;   // 저장된 총 상품 수 카운트


        let dateArray = [];

        dateArray = await getAllTargetDates();
        // 배열 맨 앞에 2020-08-02와 2022-08-02를 순서대로 추가
        dateArray.unshift('2020-08-02', '2022-08-02');

        var dateRanges = await convertToDateRanges(dateArray);
        //console.log(dateRanges);


        query = `
            SELECT TOP 1 [regDate]
            FROM [T_BOOK_SS_BK]
            WHERE [DATE_GROUP] = '0000-00-00'
            ORDER BY regDate DESC
        `;

        query = `
            SELECT TOP 1 [regDate]
            FROM [T_BOOK_SS_ORG]
            ORDER BY regDate DESC
        `;


        const resultLast = await pool.request().query(query);
        const bookList = resultLast.recordset;

        var v_regDate,start_idx
        start_idx=0
        // 데이터가 존재할 경우 시작 날짜(sDt) 업데이트
        if (bookList.length > 0) {
            const row = bookList[0];
            v_regDate=row.regDate.substring(0, 10)
        }
/*
fetchAndSaveAllProducts('regi','2026-09-30','1','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('regiFromTo','2026-09-30','2026-10-30','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10
fetchAndSaveAllProducts('regiToNow','-1','','','10')    // 2026-09-30일 소속 목록 1 개, p_4:10

*/

        ////########################################

        var save_list_num
        if (p_mode =='regi'){
            v_regDate=p_1  ////마지막 입력일;수동설정
            save_list_num=p_3            // 2인 경우 한달;15일 두개

            //// 시작 구간 찾기; 마지막 등록일자 이후
            for (let idx = 0; idx < dateRanges.length; idx++) {
                const [start, end] = dateRanges[idx];
                if (v_regDate >= start && v_regDate <= end){
                    //start_idx=idx+1     ////다음 목록에서부터
                    start_idx=idx
                    break;
                }
            }
            console.log('v_regDate 성공==',v_regDate,' start_idx:',start_idx);
            //return;

        }
        else if (p_mode =='regiFromTo'){


            dateRanges = [];
            dateRanges.push([p_1, p_2]);
            save_list_num=1
            start_idx=0


        }
        else if (p_mode =='regiToNow'){
            var cur_date = new Date(); // 현재 날짜 및 시간 생성
            var pre_date = new Date(); // 현재 날짜 및 시간 생성
            cur_date.setDate(cur_date.getDate() - 0); // 1일을 뺌
            pre_date.setDate(cur_date.getDate() + Number(p_1)); // 1일을 뺌

            dateRanges = [];
            dateRanges.push([formatDate(pre_date).substring(0, 10), formatDate(cur_date).substring(0, 10)]);
            save_list_num=1
            start_idx=0
            console.log(dateRanges);
        }


        else if (p_mode =='modiFromTo'){


            dateRanges = [];
            dateRanges.push([p_1, p_2]);
            save_list_num=1
            start_idx=0


        }
        else if (p_mode =='modiToNow'){
            var cur_date = new Date(); // 현재 날짜 및 시간 생성
            var pre_date = new Date(); // 현재 날짜 및 시간 생성
            cur_date.setDate(cur_date.getDate() - 0); // 1일을 뺌
            pre_date.setDate(cur_date.getDate() + Number(p_1)); // 1일을 뺌

            dateRanges = [];
            dateRanges.push([formatDate(pre_date).substring(0, 10), formatDate(cur_date).substring(0, 10)]);
            save_list_num=1
            start_idx=0
            console.log(dateRanges);
        }

        else {
            v_regDate=p_1  ////마지막 입력일;수동설정
        }


        ////########################################


        var nn=0

        ////기간동안 루프
        for (let idx = start_idx; idx < dateRanges.length; idx++) {
        const [start, end] = dateRanges[idx];

            if (idx >= start_idx+save_list_num){
                hasMore = false;
                break;
                //return true 는 break
                //return true;
            }

            hasMore = true;   // 반복문 종료 조건 플래그
            totalSaved_sub=0
            if (nn==0){
                console.log(`▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶ `);
                console.log('▶▶▶▶◆:',getCurrentDateTime());
            }
            console.log(`▶ ${idx + 1}번째 기간: 시작일은 ${start}이고, 종료일은 ${end}입니다.`);
            console.log(`hasMore::${hasMore}`);

            //if (idx==0){
            if (nn==0){
                query = `
                    delete aa
                    FROM [T_BOOK_SS_BK] aa
                    WHERE
                    [DATE_GROUP]='0000-00-00';
                `;

                const result2 = await pool.request().query(query);
            }
            nn++;


            page = 1;         // 시작 페이지

            while (hasMore) {

                var requestBody

                console.log(`[${page} 페이지] 상품 요청 중...`);

                // 네이버 API 요청 바디 설정

                if (p_mode =='modiFromTo'){
                    var requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_MOD_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "MOD_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };

                }
                else if (p_mode =='modiToNow'){
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_MOD_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "MOD_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                }

                else {
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_REG_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "REG_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                }


                 const response = await axios.post(
                     `${NAVER_API_URL}/v1/products/search`,
                     requestBody,
                     {
                         headers: {
                             'Authorization': `Bearer ${accessToken}`,
                             'Content-Type': 'application/json'
                         }
                     }
                 );


                const data = response.data;
                const products = data.contents || [];
                const totalElements = data.totalElements || 0; // 전체 상품 개수

                console.log(`[${page} 페이지] 받아온 상품 수: ${products.length}개 / 전체 상품 수: ${totalElements}개`);

                // 데이터가 없으면 루프 탈출
                if (products.length === 0) {
                    console.log('더 이상 가져올 상품이 없습니다.');
                    hasMore = false;
                    break;
                }

                /*
                var MEMO = JSON.stringify(products);

                var query = `
                INSERT INTO T_NNN
                (MEMO)
                VALUES
                (@MEMO)
                `;
                await pool.request()
                    .input('MEMO', sql.NVarChar, MEMO)
                    .query(query);
                */

                var valueLines = [];

                // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
                if (products.length > 0) {
                    for (var prod of products) {

                        var LIST_INFO = JSON.stringify(prod);
                        LIST_INFO = LIST_INFO.replace(/'/g, "''");
                        var DETAIL_INFO=""
                        var originProductNo = String(prod.channelProducts[0].originProductNo);
                        var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);
                        var regDate = String(prod.channelProducts[0].regDate);
                        var modifiedDate = String(prod.channelProducts[0].modifiedDate);


                        var todayStockQuantity="";

                        //if (deliveryAttributeType=='TODAY'){
                        if (deliveryAttributeType!='TODAYxxxxxx'){
                            /*
                            prodDtl=await getProdDtl(accessToken,originProductNo)
                            todayStockQuantity=prodDtl.deliveryInfo.todayStockQuantity
                            //console.log(`prodDtl ▶ ${prodDtl.toString()}`);
                            */
                            DETAIL_INFO=await getProdDtl(accessToken,originProductNo)
                            DETAIL_INFO = JSON.stringify(DETAIL_INFO);
                            DETAIL_INFO = DETAIL_INFO.replace(/'/g, "''");

                            await new Promise(resolve => setTimeout(resolve,1000));
                        }

                        // SQL 쿼리에 직접 들어갈 수 있도록 괄호 ()와 홑따옴표 ''로 감싸줍니다.
                        // 데이터 내부에 혹시 모를 홑따옴표(')가 있다면 두개('')로 치환해 에러를 방지합니다.
                        const originProductNo2 = originProductNo.replace(/'/g, "''");
                        const deliveryAttributeType2 = deliveryAttributeType.replace(/'/g, "''");
                        valueLines.push(`('0000-00-00','${originProductNo}','${deliveryAttributeType}','${LIST_INFO}','${DETAIL_INFO}','${regDate}','${modifiedDate}')`);


                    }
                }


                // 저장할 데이터가 있을 때만 DB 요청을 보냅니다.
                if (valueLines.length > 0) {
                    query = `
                        INSERT INTO [T_BOOK_SS_BK](
                            [DATE_GROUP]
                            ,[originProductNo]
                            ,[deliveryAttributeType]
                            ,[LIST_INFO]
                            ,[DETAIL_INFO]
                            ,[regDate]
                            ,[modifiedDate])
                        VALUES
                        ${valueLines.join(',\n')}
                    `;

                    const result = await pool.request().query(query);

                    totalSaved += products.length;
                    totalSaved_sub += products.length;

                    console.log(`[${page} 페이지] DB 저장 완료. 현재까지 누적 저장: ${totalSaved}개`);
                }

                // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
                if (totalSaved_sub >= totalElements) {
                    hasMore = false;
                    console.log('모든 상품을 성공적으로 가져와 저장했습니다.');
//                } else {
//                    page++; // 다음 페이지 준비
//
//                    // API 과도한 호출 제한(Rate Limit)을 피하기 위해 안전하게 0.2초 정도 쉬어줍니다.
                }


                await new Promise(resolve => setTimeout(resolve,1000));
                page++; // 다음 페이지 준비

    //            if (page >= 2) {
    //                hasMore = false;
    //            }


            } /////while (hasMore) {
        }


        ////
        query = `
            MERGE INTO [T_BOOK_SS_ORG] AS T -- 데이터를 적용할 대상
            USING [T_BOOK_SS_BK] AS S     -- 비교할 원본 데이터
            ON T.[originProductNo] = S.[originProductNo]          -- 조인 조건 (일치 여부 확인)
            AND S.[DATE_GROUP]='0000-00-00'
            -- 조건에 일치할 때 (데이터가 있는 경우)
            WHEN MATCHED THEN
                UPDATE SET
                 T.[deliveryAttributeType] =S.[deliveryAttributeType]
                ,T.[LIST_INFO]             =S.[LIST_INFO]
                ,T.[DETAIL_INFO]           =S.[DETAIL_INFO]
                ,T.[regDate]               =S.[regDate]
                ,T.[modifiedDate]          =S.[modifiedDate]
            -- 조건에 일치하지 않을 때 (대상에 데이터가 없는 경우)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
            		 [originProductNo]
            		,[deliveryAttributeType]
            		,[LIST_INFO]
            		,[DETAIL_INFO]
            		,[regDate]
            		,[modifiedDate]
            	) VALUES (
            		 S.[originProductNo]
            		,S.[deliveryAttributeType]
            		,S.[LIST_INFO]
            		,S.[DETAIL_INFO]
            		,S.[regDate]
            		,S.[modifiedDate]
            	);
        `;

        const result = await pool.request().query(query);

    } catch (error) {
        console.error('작업 중 오류 발생:', error.response ? error.response.data : error.message);
    } finally {
        if (pool) {
            await pool.close();
            console.log('DB 연결 종료');
        }
    }

}


//■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙■■■■■■■■■■★◆▶◀●◎⊙
async function check_api(p_mode,p_1,p_2,p_3,p_4) {

/*


*/
    let pool;
    var prodDtl;
    var query

    var regiCnt=0
    var modiCnt=0
    var totalCnt=0

    try {
        console.clear();
        // DB 연결
        pool = await sql.connect(dbConfig);
        console.log('DB 연결 성공');

        // Access Token 가져오기
        const accessToken = await getAccessToken();
        console.log('Access Token 발급 성공');

        let page = 1;         // 시작 페이지
        var page_size = p_4;     // 한 페이지당 가져올 상품 수 (최대 500)
        let hasMore = true;   // 반복문 종료 조건 플래그
        var totalCalled = 0;   // 저장된 총 상품 수 카운트



        var dateRanges = []


        query = `
            SELECT 'regi' p_type,AA.originProductNo,regDate apply_date
            FROM [T_BOOK_SS_ORG] AA
            where regDate > '${p_1}' and regDate < '${p_2}Z'
            union all
            Select 'modi' p_type,AA.originProductNo,modifiedDate apply_date
            FROM [T_BOOK_SS_ORG] AA
            where modifiedDate > '${p_1}' and modifiedDate < '${p_2}Z'
        `;



        const resultLast = await pool.request().query(query);
        const bookList = resultLast.recordset;

        var regi_list="XXXXXXXXX,"
        var modi_list="XXXXXXXXXX,"
        if (bookList.length > 0) {
            for (const row of bookList) {
                // 기존 코드의 row.regDate 대신 SQL에서 지정한 별칭(apply_date)을 사용해야 할 수 있습니다.
                // 만약 기존 DB 컬럼명 그대로 쓰신다면 row.regDate를 유지하되,
                // 쿼리 결과에 맞게 변수를 활용하세요.
                if (row.p_type=='regi'){
                    regi_list += row.originProductNo+'_'+row.apply_date+','
                }
                else{
                    modi_list += row.originProductNo+'_'+row.apply_date+','
                }
            }


        }

        var v_regDate,start_idx
        start_idx=0

/*
check_api('check_api','2026-10-01','2026-10-01','','500')    // 2026-09-30일 소속 목록 1 개, p_4:10
*/

        ////########################################

        var save_list_num
        //if (p_mode =='check_api2'){
            dateRanges = [];
            dateRanges.push([p_1, p_2]);
            save_list_num=1
            start_idx=0

        //}


        ////########################################


        var nn=0


        //// 기간동안 루프
        //// 신규둥록
        for (let idx = start_idx; idx < dateRanges.length; idx++) {
            totalCalled=0
            totalCalled_sub=0
            var [start, end] = dateRanges[idx];

            hasMore = true;   // 반복문 종료 조건 플래그


            if (idx >= start_idx+save_list_num){
                hasMore = false;
                break;
                //return true 는 break
                //return true;
            }

            if (nn==0){
                console.log(`▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶ : check_api  : ${getCurrentDateTime()}`);
                console.log(`▶▶ : check_api 등록 : ${getCurrentDateTime()}`);
            }
            console.log(`▶ ${idx + 1}번째 기간: 시작일은 ${start}이고, 종료일은 ${end}입니다.`);
            console.log(`hasMore::${hasMore}`);


            page = 1;         // 시작 페이지

            while (hasMore) {

                var requestBody

                console.log(`[${page} 페이지] 상품 요청 중...`);

                // 네이버 API 요청 바디 설정

                //if (p_mode =='check_api2'){
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_REG_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "REG_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                //}


                var response = await axios.post(
                    `${NAVER_API_URL}/v1/products/search`,
                    requestBody,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );


                var data = response.data;
                var products = data.contents || [];
                var totalElements = data.totalElements || 0; // 전체 상품 개수

                console.log(`[${page} 페이지] 받아온 상품 수: ${products.length}개 / 전체 상품 수: ${totalElements}개`);

                // 데이터가 없으면 루프 탈출
                if (products.length === 0) {
                    console.log('더 이상 가져올 상품이 없습니다.');
                    hasMore = false;
                    break;
                }

                var valueLines = [];

                regiCnt=0
                // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
                if (products.length > 0) {
                    totalCalled += products.length;
                    totalCalled_sub += products.length;
                    for (var prod of products) {
                        var LIST_INFO = JSON.stringify(prod);
                        LIST_INFO = LIST_INFO.replace(/'/g, "''");
                        var DETAIL_INFO=""
                        var originProductNo = String(prod.channelProducts[0].originProductNo);
                        var regDate = String(prod.channelProducts[0].regDate);
                        var modifiedDate = String(prod.channelProducts[0].modifiedDate);
                        var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);


                        var todayStockQuantity="";

                        if (regi_list.indexOf(','+originProductNo+'_'+regDate+',')==-1){
                            //// 이미 등록된 것이 없는 것만 입력한다.##########################
                            regiCnt++
                        }
                    }

                }

                console.log(`■ 적용 regiCnt: ${regiCnt}`);
                totalCnt +=regiCnt


                // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
                if (totalCalled_sub >= totalElements) {
                    hasMore = false;
                }
                console.log(`■ totalCalled_sub: ${totalCalled_sub} ■ totalElements: ${totalElements}`);

                await new Promise(resolve => setTimeout(resolve,1000));
                page++; // 다음 페이지 준비

            } /////while (hasMore) {

        }



        //// 기간동안 루프
        //// 변경상품
        nn=0
        for (let idx = start_idx; idx < dateRanges.length; idx++) {
            totalCalled=0
            totalCalled_sub=0
            var [start, end] = dateRanges[idx];

            if (idx >= start_idx+save_list_num){
                hasMore = false;
                break;
                //return true 는 break
                //return true;
            }

            hasMore = true;   // 반복문 종료 조건 플래그
            if (nn==0){
                console.log(`▶▶ : check_api 변경 : ${getCurrentDateTime()}`);
            }
            console.log(`▶ ${idx + 1}번째 기간: 시작일은 ${start}이고, 종료일은 ${end}입니다.`);
            console.log(`hasMore::${hasMore}`);


            page = 1;         // 시작 페이지

            while (hasMore) {

                var requestBody

                console.log(`[${page} 페이지] 상품 요청 중...`);

                // 네이버 API 요청 바디 설정

                //if (p_mode =='check_api2'){
                    requestBody = {
                        page: page,
                        size: page_size,
                        periodType: "PROD_MOD_DAY",
                        fromDate: start,
                        toDate: end,
                        orderType: "MOD_DATE",
                        productStatusTypes: ["SALE","WAIT"]
                    };
                //}


                 var response = await axios.post(
                     `${NAVER_API_URL}/v1/products/search`,
                     requestBody,
                     {
                         headers: {
                             'Authorization': `Bearer ${accessToken}`,
                             'Content-Type': 'application/json'
                         }
                     }
                 );


                var data = response.data;
                var products = data.contents || [];
                var totalElements = data.totalElements || 0; // 전체 상품 개수

                console.log(`■ [${page} 페이지] 받아온 상품 수: ${products.length}개 / 전체 상품 수: ${totalElements}개`);

                // 데이터가 없으면 루프 탈출
                if (products.length === 0) {
                    console.log('더 이상 가져올 상품이 없습니다.');
                    hasMore = false;
                    break;
                }

                var valueLines = [];

                modiCnt=0
                // DB에 상품 데이터 저장 (각 페이지별 루프 내에서 Insert 수행)
                if (products.length > 0) {
                    totalCalled += products.length;
                    totalCalled_sub += products.length;
                    for (var prod of products) {

                        var LIST_INFO = JSON.stringify(prod);
                        LIST_INFO = LIST_INFO.replace(/'/g, "''");
                        var DETAIL_INFO=""
                        var originProductNo = String(prod.channelProducts[0].originProductNo);
                        var regDate = String(prod.channelProducts[0].regDate);
                        var modifiedDate = String(prod.channelProducts[0].modifiedDate);
                        var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);


                        var todayStockQuantity="";

                        if (modi_list.indexOf(','+originProductNo+'_'+modifiedDate+',')==-1){
                            //// 이미 등록된 것이 없는 것만 입력한다.##########################
                           modiCnt++

                        }

                    }
                }

                console.log(`■ 적용 modiCnt: ${modiCnt}`);
                totalCnt +=modiCnt

                // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
                if (totalCalled_sub >= totalElements) {
                    hasMore = false;
                    //console.log('모든 상품을 성공적으로 가져왔했습니다.');
                }
                console.log(`■  totalCalled_sub: ${totalCalled_sub}  totalElements: ${totalElements}`);

                await new Promise(resolve => setTimeout(resolve,1000));
                page++; // 다음 페이지 준비

            } /////while (hasMore) {
        }
        var rtnStr=`{"totalElements":${totalCnt}}`
        return " ■적용할 등록수: " + regiCnt+" ■적용할 변경수: " + modiCnt+" ■■전체수: " + totalCnt;
        //return rtnStr;


    } catch (error) {
        console.error('작업 중 오류 발생:', error.response ? error.response.data : error.message);
        //return error.message;
    } finally {
        if (pool) {
            await pool.close();
            console.log('DB 연결 종료');
        }
    }

}


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

function test_fn(p1,p2,p3) {

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

    console.log(`■■■ common.js ■■■ function test_fn()`);

    //return year + month + day + hours + minutes + seconds;
    return year + '-' +  month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;

}


module.exports = {
fetchAndSaveAllProducts,
fetchAndSaveAllProducts9,
check_api,
update_last,
get_order_prod,
test_fn
};
