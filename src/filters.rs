use warp::{Filter, Rejection, Reply};

pub fn all_filters() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    health_filter().or(index_filter()).with(warp::log("abvt"))
}

fn index_filter() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    warp::fs::dir("www/dist")
}

fn health_filter() -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    warp::path("health").and(warp::path::end()).map(|| "Ok")
}
