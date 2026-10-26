
const bcrypt = require('bcrypt');
//const axios = require('axios');

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
        }
    }
};

function formatDate(date) {
/*
날자형식
예: 2026-09-26 09:32:00
const now = new Date();
console.log(formatDate(now)); // 예: 2026-09-26 09:32:00
const result = str.substring(0, 16); // 0번째부터 16글자

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

// 3. 네이버 커머스 API - 상품 목록 가져오기 함수
async function getProducts(accessToken) {
    try {
        const response = await axios.post(`${NAVER_API_URL}/v1/products/search`, {
            page: 1,
            size: 10, // 한 번에 가져올 상품 수 (최대 500)
            periodType: "PROD_REG_DAY",
            fromDate: "2026-01-01",
            toDate: "2026-06-10",
            orderType: "NO",
            productStatusTypes: ["SALE","WAIT"]
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json;charset=UTF-8;'
            }
        });

        // 응답 구조는 네이버 API 버전에 따라 조금씩 다를 수 있으므로 console.log로 확인 필요
        return response.data.contents || [];
    } catch (error) {
        console.error('상품 조회 실패:', error.response ? error.response.data : error.message);
        throw error;
    }
}


// 4. MSSQL 데이터베이스에 상품 데이터 저장 함수 (Upsert 방식)
async function saveProductsToDB(products) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        console.log('SQL Server 연결 성공');

        for (const prod of products) {
            // API 응답 데이터 매핑 (API 필드명에 맞춰 수정 필요)
            //var MEMO = prod.channelProducts[0].name;
            var MEMO = JSON.stringify(prod.channelProducts[0]);

            const query = `
            INSERT INTO T_NNN
            (MEMO)
            VALUES
            (@MEMO)
            `;
            await pool.request()
                .input('MEMO', sql.VarChar, MEMO)
                .query(query);
        }

        console.log(`${products.length}개의 상품 정보가 DB에 동기화되었습니다.`);
    } catch (error) {
        console.error('DB 저장 실패:', error);
    } finally {
        if (pool) await pool.close();
    }
}


// 5. 메인 실행 프로세스
async function main() {
    try {
        console.log('1. 스마트스토어 토큰 발급 중...');
        const token = await getAccessToken();

        console.log('2. 상품 목록 호출 중...');
        const products = await getProducts(token);

        if (products.length === 0) {
            console.log('가져올 상품이 없습니다.');
            return;
        }
        //console.log('■■■'+JSON.stringify(products));

        console.log(`3. DB 저장 중... (총 ${products.length}건)`);
        await saveProductsToDB(products);

    } catch (error) {
        console.error('프로세스 오류:', error);
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
async function fetchAndSaveAllProducts() {
    let pool;
    var prodDtl;
    try {
        // DB 연결
        pool = await sql.connect(dbConfig);
        console.log('DB 연결 성공');

        // Access Token 가져오기
        const accessToken = await getAccessToken();
        console.log('Access Token 발급 성공');

        let page = 1;         // 시작 페이지
        const size = 100;     // 한 페이지당 가져올 상품 수 (최대 100)
        let hasMore = true;   // 반복문 종료 조건 플래그
        let totalSaved = 0;   // 저장된 총 상품 수 카운트


        var v_now = new Date();
        var v_now2 = (formatDate(v_now)).substring(0, 16); // 0번째부터 16글자



        while (hasMore) {
            console.log(`[${page} 페이지] 상품 요청 중...`);

            // 네이버 API 요청 바디 설정
            const requestBody = {
                page: page,
                size: size,
                periodType: "PROD_REG_DAY",
                fromDate: "2026-01-02",
                toDate: "2026-01-20",
                orderType: "REG_DATE",
                productStatusTypes: ["SALE","WAIT"]
            };


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
            for (var prod of products) {

                var LIST_INFO = JSON.stringify(prod);
                LIST_INFO = LIST_INFO.replace(/'/g, "''");
                var DETAIL_INFO=""
                var originProductNo = String(prod.channelProducts[0].originProductNo);
                var deliveryAttributeType = String(prod.channelProducts[0].deliveryAttributeType);
                var todayStockQuantity="";

                if (deliveryAttributeType=='TODAY'){
                //if (deliveryAttributeType!='TODAYxxxxxxx'){
                    /*
                    prodDtl=await getProdDtl(accessToken,originProductNo)
                    todayStockQuantity=prodDtl.deliveryInfo.todayStockQuantity
                    //console.log(`prodDtl ▶ ${prodDtl.toString()}`);
                    */
                    DETAIL_INFO=await getProdDtl(accessToken,originProductNo)
                    DETAIL_INFO = JSON.stringify(DETAIL_INFO);
                    DETAIL_INFO = DETAIL_INFO.replace(/'/g, "''");

                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // SQL 쿼리에 직접 들어갈 수 있도록 괄호 ()와 홑따옴표 ''로 감싸줍니다.
                // 데이터 내부에 혹시 모를 홑따옴표(')가 있다면 두개('')로 치환해 에러를 방지합니다.
                const originProductNo2 = originProductNo.replace(/'/g, "''");
                const deliveryAttributeType2 = deliveryAttributeType.replace(/'/g, "''");
                valueLines.push(`('${v_now2}','${originProductNo2}','${LIST_INFO}','${DETAIL_INFO}')`);


            }

            // 저장할 데이터가 있을 때만 DB 요청을 보냅니다.
            if (valueLines.length > 0) {
                /*
                // 형식을 VALUES ('값1'), ('값2'), ('값3') 구조로 만듭니다.
                const query = `
                    INSERT INTO T_NNN (MEMO2)
                    VALUES ${valueLines.join(',\n')}
                `;
                const result = await pool.request().query(query);
                console.log(`${valueLines.length}개의 상품 데이터가 INSERT 되었습니다.`);
                */

                query = `INSERT INTO [T_BOOK_SMARTSTORE]
                           ([DATE_GROUP]
                           ,[originProductNo]
                           ,[LIST_INFO]
                           ,[DETAIL_INFO])
                     VALUES
                     ${valueLines.join(',\n')}
                `;

                const result = await pool.request().query(query);

            }


            totalSaved += products.length;
            console.log(`[${page} 페이지] DB 저장 완료. 현재까지 누적 저장: ${totalSaved}개`);

            // 조건 체크: 지금까지 저장한 개수가 전체 개수 이상이면 종료
            if (totalSaved >= totalElements) {
                hasMore = false;
                console.log('모든 상품을 성공적으로 가져와 저장했습니다.');
            } else {
                page++; // 다음 페이지 준비

                // API 과도한 호출 제한(Rate Limit)을 피하기 위해 안전하게 0.2초 정도 쉬어줍니다.
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }


    } catch (error) {
        console.error('작업 중 오류 발생:', error.response ? error.response.data : error.message);
    } finally {
        if (pool) {
            await pool.close();
            console.log('DB 연결 종료');
        }
    }
}

//main();

fetchAndSaveAllProducts();







