queue()
.defer(d3.csv, "data/salaries.csv")
.await(makeGraphs);

function makeGraphs (error, salariesData){
    
}