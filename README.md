# Yururi (OimoTasks)

思考補助・着手支援を目的とした、罪悪感を生まないタスク管理アプリです。

## 主要機能

- **プロジェクト管理**: 3つのステータス（Active, Chill, Stalled）でプロジェクトの状態を可視化
- **タスク階層管理**: 最大3階層（プロジェクト > まとめタスク > 作業タスク）で柔軟に整理
- **ダッシュボード**: 「今日のフォーカス」や「締切が近いタスク」を自動でピックアップ
- **ガントチャート**: 2週間（日次）/ 5週間（週次）/ 6ヶ月（長期）の切り替え可能なスケジュールビュー
- **パズル感覚の調整**: ドラッグ＆ドロップで直感的にスケジュールを変更可能
- **認証 & データ保護**: Google/Email認証によるユーザーごとのプライベートデータ管理

## 技術スタック

- **Frontend**: React, TypeScript, Vite
- **Styling**: TailwindCSS
- **State Management**: React Context + Hooks (Custom Store)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google, Email/Password)
- **Deployment**: PWA Supported
- **Icons**: lucide-react
