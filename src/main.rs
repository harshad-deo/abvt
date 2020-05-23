extern crate pretty_env_logger;
#[macro_use]
extern crate log;

use warp::Filter;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();
    info!("Initializing ABVT");

    let index = warp::fs::dir("www/dist");
    // just a simple health check
    let health = warp::path!("health").map(|| "Ok");

    let routes = index.or(health);

    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}
