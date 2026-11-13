import 'reflect-metadata';

// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.MENU_SEND_NOT_BEFORE = '2020-01-01T00:00:00+09:00';
