extern crate pretty_env_logger;
#[macro_use]
extern crate log;

use abvt::filters;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();
    info!("Initializing ABVT");

    let routes = filters::all_filters();
    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}
