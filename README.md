- [1. 業務要件](#1-業務要件)
  - [1.1. エンティティ](#11-エンティティ)
  - [1.2. コントラクト仕様](#12-コントラクト仕様)
    - [1.2.1. ## STEP1 全般](#121--step1-全般)
    - [1.2.2. ## STEP2 事前登録](#122--step2-事前登録)
    - [1.2.3. ## STEP3 入庫時](#123--step3-入庫時)
    - [1.2.4. ## STEP4 出庫時](#124--step4-出庫時)
    - [1.2.5. ## STEP5 預託終了](#125--step5-預託終了)

# 1. 業務要件

## 1.1. エンティティ

- Alice コインパーキングの利用者
- Bob コインパーキングの管理者
- Carol サービスオーナー（＝コントラクトオーナー）

## 1.2. コントラクト仕様

### 1.2.1. ## STEP1 全般

- このコントラクトは任意の ERC-20 トークンを扱うことができる
- コントラクトはパーキング管理者リスト(Bob など)を保有する
- コントラクトはパーキング入庫状態(Alice など)を保有する
- Carol はパーキング管理者リストに Bob を登録または削除することができる
- Carol は料金レート(1 分あたりの単価)を指定・更新することができる
- Bob は Alice の入庫および出庫を記録することができる

### 1.2.2. ## STEP2 事前登録

- Alice は事前に預託金として任意のトークンをコントラクトにデポジットする
- このとき、Alice は Bob を指名する必要がある
- 続けて Alice は別種のトークンをデポジットすることもできる。再び Bob を指名しても良いし、別のパーキング管理者を指名しても良い
- Alice は一定期間(仮に 1 カ月とする)これを引き出すことができない

### 1.2.3. ## STEP3 入庫時

- Alice が Bob の駐車場に入庫したとき、Bob はコントラクトに「Alice が入庫した」ことを記録する

### 1.2.4. ## STEP4 出庫時

- Alice が Bob の駐車場を出庫したとき、Bob はコントラクトに「Alice が出庫した」ことを記録する
- コントラクトは Alice が滞在した時間(分)に料金レートを乗じた駐車料金を自動算出し、駐車料金からシステム手数料（仮に３％とする）を差し引いた分を Bob に送金し、システム手数料を Carol に送金する。最後にこれらに相当する金額を Alice のデポジットから差し引くことで清算を完了する

### 1.2.5. ## STEP5 預託終了

- 一定期間経過後、Alice はデポジット残高を Alice のアドレスへ引き出すことができる。これはトークンの種類ごとに実行する必要がある。
- Carol だけはいつでも Alice のデポジット残高を Alice のアドレスへ引き戻すことができる
