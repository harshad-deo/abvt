use futures::sink::SinkExt;
use futures::StreamExt;
use tokio::time::{self, Duration};
use warp::filters::ws::{Message, WebSocket};

/// # Arguments
/// * `agent_count` - Number of agents
/// * `scale_x` - Scale along x dimension. Axis size is 2 ** scale_x
/// * `scale_y` - Scale along y dimension. Axis size is 2 ** scale_y
pub async fn new(websocket: WebSocket, agent_count: u32, scale_x: u8, scale_y: u8) {
  info!(
    "Initiating new simulation with agents: {}, scales: ({} x {})",
    agent_count, scale_x, scale_y
  );
  let dim_x: u64 = (1 as u64) << scale_x;
  let dim_y: u64 = (1 as u64) << scale_y;
  let mask_x = dim_x - 1;
  let mask_y = dim_y - 1;

  let (mut ws_tx, _) = websocket.split();
  let time_step = Duration::from_millis(30);

  let mut idx = 0;

  loop {
    let msg = Message::text(format!("{}", idx));
    if let Err(_) = ws_tx.send(msg).await {
      info!("Socket connection closed. Terminating simulation");
      break;
    }
    idx += 1;
    time::delay_for(time_step).await;
  }

  info!("Terminated simulation");
}
