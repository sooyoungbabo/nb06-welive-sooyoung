/* postgreSQL 접속 */
psql postgresql://아이디:비밀번호@localhost:5432/데이터베이스
psql postgresql://postgres:password@172.31.248.157:5432/mission7
psql postgresql://postgres:password@localhost:5432/mission7

psql -U 아이디 -h localhost -p 5432 -d 데이터베이스

-- 모든 테이블, 스키마 죽이기
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name text,
  email text UNIQUE NOT NULL,
  age int,
  gender text,
  height real,
  weight real,
  sign_up_day text,
  address text,s
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at timestamp DEFAULT NULL
);

DROP TABLE users;

-- 기본 CRUD
SELECT * FROM users;  -- 모든 로우 조회  
SELECT * FROM users WHERE id = 1;  -- 아이디가 1인 로우 조회

INSERT INTO users (name, email) VALUES ('코드잇', 'codeit@example.com');  -- 로우 생성

UPDATE users SET email = 'codeit-sprint@example.com' WHERE id = 1;  -- 아이디가 1인 로우 수정
UPDATE users SET email = 'codeit@example.com', updated_at = now() WHERE id = 1; -- 아이디가 1인 로우의 여러 칼럼을 수정

DELETE FROM users WHERE id = 1;  -- 아이디가 1인 로우 제거
DELETE FROM users; -- 모든 로우 제거

/* SOFT DELETE: 회원탈퇴했을 때 잠시 삭제 유보*/
UPDATE users
SET deleted_at = NOW()
WHERE id = 1;

SELECT *
FROM users
WHERE deleted_at IS NULL;

/* ENUM 설정, 컬럼 추가, 컬럼 삭제 */
CREATE TYPE user_role_enum AS ENUM ('user', 'admin', 'moderator'); -- ENUM 타입 생성

ALTER TABLE users
ADD COLUMN role user_role_enum NOT NULL DEFAULT 'user'; -- ENUM 타입

ALTER TABLE users DROP COLUMN role;

/* CONSTRAINT 제약조건 */
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_length CHECK (LENGTH(content) >= 4)
);

-- 기존 제약사항 삭제
ALTER TABLE posts
	DROP CONSTRAINT content_length;

-- 새로운 제약사항 추가
ALTER TABLE posts
  ADD CONSTRAINT content_length CHECK (LENGTH(content) >= 10);



/* FK: 고아 레코드 생성을 방지함으로써 데이터 무결성 보장 */
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/* FK에 NOT NULL 속성 추가 */
ALTER TABLE posts
  ALTER COLUMN user_id SET NOT NULL;


/* 이미 존재하는 FK Constraint를 제거하기 */
ALTER TABLE posts
  DROP CONSTRAINT posts_user_id_fkey;


/* 이미 존재하는 컬럼을 FK로 지정하기 */
ALTER TABLE posts
  ADD CONSTRAINT fk_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

/* TRANSCTION */
BEGIN; -- 트랜잭션 시작

-- 필요한 쿼리 진행

ROLLBACK; -- 만약 쿼리를 진행하다가 이상이 생겼다면 취소 가능

COMMIT; -- 위에서 작성한 쿼리들을 실행한 결과를 확정하기

/* .sql 화일 만들고, \i 로 시행. 중간에 에러 생기면 자동 rollback */


CREATE INDEX idx_user_email ON users (email);
CREATE INDEX idx_user_email_name ON users (email, name);

explain analyze

ALTER TABLE posts
RENAME COLUMN old_name TO new_name;

ALTER TABLE "RawData"
RENAME TO raw_data;