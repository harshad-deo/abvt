extern crate pretty_env_logger;
#[macro_use]
extern crate log;

use warp::Filter;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();
    info!("Initializing ABVT");

    let hello = warp::path!("hello" / String).map(|name| format!("Hello {}!", name));

    warp::serve(hello).run(([0, 0, 0, 0], 8080)).await;
}
