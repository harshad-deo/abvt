use super::sim;
use warp::{Filter, Rejection, Reply};

pub fn all_filters() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
  health_filter()
    .or(index_filter())
    .or(ws_filter())
    .with(warp::log("abvt"))
}

fn index_filter() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
  warp::fs::dir("www/dist")
}

fn health_filter() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
  warp::path("health").and(warp::path::end()).map(|| "Ok")
}

const AGENT_COUNT: u32 = 1024;
const SIM_SIZE: u16 = 1024;
const SCALE_X: u8 = 8;
const SCALE_Y: u8 = 8;

fn ws_filter() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
  warp::path("ws").and(warp::ws()).map(move |ws: warp::ws::Ws| {
    ws.on_upgrade(move |websocket| sim::new(websocket, AGENT_COUNT, SIM_SIZE, SCALE_X, SCALE_Y))
  })
}
