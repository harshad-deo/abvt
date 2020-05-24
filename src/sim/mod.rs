use super::msg;
use futures::sink::SinkExt;
use futures::StreamExt;
use rand::distributions::{Distribution, Uniform};
use tokio::time::{self, Duration};
use warp::filters::ws::{Message, WebSocket};

/// # Arguments
/// * `agent_count` - Number of agents
/// * `sim_dim` - Simulation dimensionality
/// * `scale_x` - Scale along x dimension. Axis size is 2 ** scale_x
/// * `scale_y` - Scale along y dimension. Axis size is 2 ** scale_y
pub async fn new(websocket: WebSocket, agent_count: u32, sim_dim: u16, scale_x: u8, scale_y: u8) {
  info!(
    "Initiating new simulation with agents: {}, scales: ({} x {})",
    agent_count, scale_x, scale_y
  );
  let dim_x: u32 = (1 as u32) << scale_x;
  let dim_y: u32 = (1 as u32) << scale_y;

  let (mut ws_tx, _) = websocket.split();
  let time_step = Duration::from_millis(30);

  let mut idx: u64 = 0;

  let agent_count = agent_count as usize;

  let (mut positions, scores) = initial_position_score(agent_count, sim_dim, dim_x, dim_y);

  let score_denom = sim_dim as f32;
  let scores_norm: Vec<f32> = scores.into_iter().map(|x| (x as f32) / score_denom).collect();

  let mut positions_norm: Vec<f32> = Vec::with_capacity(agent_count * 2);
  unsafe {
    positions_norm.set_len(agent_count * 2);
  }
  let dim_x_denom = dim_x as f32;
  let dim_y_denom = dim_y as f32;

  let mut msg_capacity: usize = sim_dim as usize * 12 + 64;

  loop {
    for i in 0..agent_count {
      positions_norm[i * 2] = (positions[i * 2] as f32) / dim_x_denom;
      positions_norm[i * 2 + 1] = (positions[i * 2 + 1] as f32) / dim_y_denom;
    }

    let mut builder = flatbuffers::FlatBufferBuilder::new_with_capacity(msg_capacity);
    let positions_idx = builder.create_vector_direct(&positions_norm);
    let score_idx = builder.create_vector_direct(&scores_norm);

    let mut msg_builder = msg::simstep::abvt::SimStepBuilder::new(&mut builder);
    msg_builder.add_idx(idx);
    msg_builder.add_positions(positions_idx);
    msg_builder.add_score(score_idx);
    let msg_offset = msg_builder.finish();

    builder.finish(msg_offset, None);

    let buf = builder.finished_data();
    msg_capacity = buf.len();

    let msg = Message::binary(buf);
    if let Err(_) = ws_tx.send(msg).await {
      info!("Socket connection closed. Terminating simulation");
      break;
    }
    idx += 1;
    update_positions(&mut positions, agent_count, dim_x, dim_y);
    time::delay_for(time_step).await;
  }

  info!("Terminated simulation");
}

fn initial_position_score(agent_count: usize, sim_dim: u16, dim_x: u32, dim_y: u32) -> (Vec<u32>, Vec<u16>) {
  let mut rng = rand::thread_rng();

  let positions: Vec<u32> = {
    let mut res = Vec::with_capacity(agent_count * 2);
    let uniform_x = Uniform::from(0..dim_x);
    let uniform_y = Uniform::from(0..dim_y);
    for _ in 0..agent_count {
      res.push(uniform_x.sample(&mut rng));
      res.push(uniform_y.sample(&mut rng));
    }
    res
  };
  let scores: Vec<u16> = {
    let mut res = Vec::with_capacity(agent_count);
    let uniform_scores = Uniform::from(0..sim_dim);
    for _ in 0..agent_count {
      res.push(uniform_scores.sample(&mut rng));
    }
    res
  };

  (positions, scores)
}

fn update_positions(positions: &mut Vec<u32>, agent_count: usize, dim_x: u32, dim_y: u32) {
  let mut rng = rand::thread_rng();
  let bump = Uniform::from(0..5);
  let mask_x = dim_x - 1;
  let mask_y = dim_y - 1;

  for i in 0..agent_count {
    let bump_x = match i & 3 {
      0 | 1 => bump.sample(&mut rng),
      _ => dim_x - bump.sample(&mut rng),
    };
    let bump_y = match i & 3 {
      0 | 2 => bump.sample(&mut rng),
      _ => dim_y - bump.sample(&mut rng),
    };
    positions[i * 2] = (positions[i * 2] + bump_x) & mask_x;
    positions[i * 2 + 1] = (positions[i * 2 + 1] + bump_y) & mask_y;
  }
}
