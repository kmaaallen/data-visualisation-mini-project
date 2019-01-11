queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);

function makeGraphs(error, salariesData) {
    var ndx = crossfilter(salariesData);

    salariesData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_service = parseInt(d["yrs.service"]);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
    })

    show_discipline_selector(ndx);

    show_percent_that_are_professors(ndx, "Female", "#percent-of-women-professors");
    show_percent_that_are_professors(ndx, "Male", "#percent-of-men-professors");
    show_gender_balance(ndx);

    show_average_salary(ndx);
    show_rank_distribution(ndx);

    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);

    dc.renderAll();
}

function show_discipline_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();

    dc.selectMenu('#discipline-selector')
        .dimension(dim)
        .group(group);
}

function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        function(p, v) {
            if (v.sex == gender) {
                p.count++;
                if (v.rank == "Prof") {
                    p.areProf++;
                }
            }
            return p;
        },

        function(p, v) {
            if (v.sex == gender) {
                p.count--;
                if (v.rank == "Prof") {
                    p.areProf--;
                }
            }
            return p;
        },

        function() {
            return { count: 0, areProf: 0 };
        }
    );
    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function(d) {
            if (d.count == 0) {
                return 0;
            }
            else {
                return (d.areProf / d.count);
            }
        })
        .group(percentageThatAreProf);
}

function show_gender_balance(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();
    dc.barChart("#gender-balance")
        .width(400)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(false)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}


function show_average_salary(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));

    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        }
        else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }

    function initialise() {
        return { count: 0, total: 0, average: 0 };
    }
    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise);

    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(averageSalaryByGender)
        .valueAccessor(function(d) {
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}

function show_rank_distribution(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));

    function rankByGender(dimension, rank) {
        return dimension.group().reduce(
            function(p, v) {
                p.total++;
                if (v.rank == rank) {
                    p.match++;
                }
                return p;
            },
            function(p, v) {
                p.total--;
                if (v.rank == rank) {
                    p.match--;
                }
                return p;
            },

            function() {
                return { total: 0, match: 0 };
            }
        );
    }
    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");

    dc.barChart("#rank-by-gender")
        .width(400)
        .height(300)
        .dimension(dim)
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "Asst Prof")
        .stack(assocProfByGender, "Assoc Prof")
        .valueAccessor(function(d) {
            if (d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            }
            else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({ top: 10, right: 100, bottom: 30, left: 30 });
}

function show_service_to_salary_correlation(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Male", "Female"])
        .range(["blue", "pink"]);

    var service_dim = ndx.dimension(dc.pluck("yrs_service"));
    var salary_serv_dim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary, d.sex, d.rank];
    });
    var experience_salary_group = salary_serv_dim.group();

    var minYears = service_dim.bottom(1)[0].yrs_service;
    var maxYears = service_dim.top(1)[0].yrs_service;

    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minYears, maxYears]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .xAxisLabel("Years of Service")
        .yAxisLabel("Salary")
        .title(function(d) {
            return d.key[3] + " earned " + d.key[1];
        })
        .colorAccessor(function(d) {
            return d.key[2];
        })
        .colors(genderColors)
        .dimension(salary_serv_dim)
        .group(experience_salary_group)
        .margins({ top: 10, right: 50, bottom: 75, left: 75 });
}

function show_phd_to_salary_correlation(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Male", "Female"])
        .range(["blue", "pink"]);

    var phd_dim = ndx.dimension(dc.pluck("yrs_since_phd"));
    var salary_phd_dim = ndx.dimension(function(d) {
        return [d.yrs_since_phd, d.salary, d.sex, d.rank];
    });
    var phd_salary_group = salary_phd_dim.group();

    var minYears = phd_dim.bottom(1)[0].yrs_service;
    var maxYears = phd_dim.top(1)[0].yrs_service;

    dc.scatterPlot("#salary-phd")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minYears, maxYears]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .xAxisLabel("Years since phD")
        .yAxisLabel("Salary")
        .title(function(d) {
            return d.key[3] + " earned " + d.key[1];
        })
        .colorAccessor(function(d) {
            return d.key[2];
        })
        .colors(genderColors)
        .dimension(salary_phd_dim)
        .group(phd_salary_group)
        .margins({ top: 10, right: 50, bottom: 75, left: 75 });
}