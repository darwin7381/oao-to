// Rate Limiter Durable Object
//
// 為什麼用 DO：KV 是最終一致性 + read-then-write，並發 burst 可完全繞過限流。
// DO 每個 key 一個實例、單執行緒序列化處理，read-modify-write 原子，
// 並發請求會被 input gate 排隊，計數不可能被繞過。

export interface RateLimitCheckRequest {
  perMinute: number;
  perDay: number;
}

interface WindowState {
  minuteWindow: number;
  minuteCount: number;
  dayWindow: number;
  dayCount: number;
}

export class RateLimiterDO {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const { perMinute, perDay } = (await request.json()) as RateLimitCheckRequest;
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60_000);
    const dayWindow = Math.floor(now / 86_400_000);
    const minuteReset = (minuteWindow + 1) * 60_000;
    const dayReset = (dayWindow + 1) * 86_400_000;

    // 讀取現有狀態（input gate 保證這段 read-modify-write 對同一 DO 是原子的）
    const stored = (await this.state.storage.get<WindowState>('state')) ?? {
      minuteWindow, minuteCount: 0, dayWindow, dayCount: 0,
    };

    // 窗口滾動：窗口變了就歸零
    let minuteCount = stored.minuteWindow === minuteWindow ? stored.minuteCount : 0;
    let dayCount = stored.dayWindow === dayWindow ? stored.dayCount : 0;

    if (minuteCount >= perMinute) {
      return Response.json({
        allowed: false, scope: 'minute',
        remainingMinute: 0, remainingDay: Math.max(0, perDay - dayCount),
        minuteReset, dayReset, perMinute, perDay,
      });
    }
    if (dayCount >= perDay) {
      return Response.json({
        allowed: false, scope: 'day',
        remainingMinute: Math.max(0, perMinute - minuteCount), remainingDay: 0,
        minuteReset, dayReset, perMinute, perDay,
      });
    }

    minuteCount += 1;
    dayCount += 1;
    await this.state.storage.put<WindowState>('state', { minuteWindow, minuteCount, dayWindow, dayCount });
    // 讓過期狀態自動清掉（DO storage 無 TTL，用 alarm 省成本；此處簡化：靠下次覆寫）

    return Response.json({
      allowed: true,
      remainingMinute: perMinute - minuteCount,
      remainingDay: perDay - dayCount,
      minuteReset, dayReset, perMinute, perDay,
    });
  }
}
