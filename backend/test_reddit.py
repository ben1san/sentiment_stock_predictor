# backend/test_reddit.py
import requests
import json

def test_reddit_connection(ticker="NVDA"):
    url = f"https://www.reddit.com/r/wallstreetbets/search.json?q={ticker}&restrict_sr=1&sort=new&limit=3"
    
    # ここで名乗るUser-Agentが超重要です。
    # ※ yourusername の部分は、もしRedditアカウントを持っていればそれに変えてください。
    # 持っていなければ適当な名前（例: hackathon_ninja_99）でも大抵通ります。
    headers = {
        'User-Agent': 'macos:hellowallstreet.app:v1.0.0 (by /u/yourusername)'
    }

    print(f"🚀 {ticker}のデータをRedditから取得中...")
    print(f"URL: {url}")
    print(f"User-Agent: {headers['User-Agent']}\n")

    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        # ステータスコードの確認 (200なら成功、429ならリミット制限)
        print(f"Status Code: {response.status_code}")
        response.raise_for_status() 
        
        data = response.json()
        posts = data.get('data', {}).get('children', [])
        
        print(f"\n✅ 取得成功！ {len(posts)}件の投稿が見つかりました。\n")
        
        # 最初の1件だけ中身を覗いてみる
        if posts:
            first_post = posts[0].get('data', {})
            print("--- 最新の投稿サンプル ---")
            print(f"タイトル: {first_post.get('title')}")
            print(f"スコア: {first_post.get('score')}")
            print(f"URL: {first_post.get('url')}")
            print("--------------------------")
            
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTPエラー発生: {e}")
        if response.status_code == 429:
            print("💡 エラー原因: Too Many Requests (短時間に叩きすぎたか、User-Agentが弾かれました)")
    except Exception as e:
        print(f"❌ 予期せぬエラー: {e}")

if __name__ == "__main__":
    test_reddit_connection("NVDA")