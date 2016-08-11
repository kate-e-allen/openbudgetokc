var ob     = ob || {};
ob.display = ob.display || {};
;(function(namespace, undefined) {
  namespace.budget_radar = function () {


    //--------------------------------------------------
    // SOFT Dependency check, some failure doesn't stop it
    //      but you will see a message in the log
    //      it goes by feel, so it can give false positives!
    //--------------------------------------------------
    var missingDeps = checkDependencies([   {target:R       ,expected:"object"},
                                            {target:ob.hash ,expected:"function"},
                                            {target:ob.data ,expected:"function"},
                                        ]);
    if(missingDeps.length !== 0)
    {
      console.log("some dependencies appaer to be missing or mis-typed", missingDeps);
    }

    // I moved a lot of the hash stuff that was in tree
    // to the hash.js location
    // so it can be used in multiple sites
    var Hash = ob.hash();
    


    //--------------------------------------------------
    // Good Defaults
    //--------------------------------------------------


    // Based on the standard page view model
    var _layout = {
      width: 800,
      height: 500,
      margin: {top: 100, right: 100, bottom: 100, left: 100}
    };

    var _palette = [
      '#970000',
      '#CD0059',
      '#E23600',
      '#F07400',
      '#EDA400',
      '#009F76',
      // '#009DB0',
      // '#00C0D7',
      '#008F16',
      '#395BF6',
      '#690180'
    ];
    
    var _threshold = 0.7;
    
    var margin = _layout.margin;
    var _radar_selector = "#radar";    

    // don't want to rename and break the local convention
    // but this is a lot like a set of cursor functions
    // from XML 
    var _cruncher = ob.data.hierarchy()
    // I am changing the getLevel function around some
    // but this is like the get: in tree xo    
    var getLevel  = function(root,hash) {
      if (hash.length < 1) {
        return root;
      }
      return _cruncher.spelunk (
        root,
        hash,
        Hash.compare
      );
    };    





    //--------------------------------------------------
    //INIT NULL
    //--------------------------------------------------
    var budgetAxis = []
    var _url = null;
    
    
    
    // Fetch the Data and draw the chart on return 
    // Expecting data to match the tree format
    
    var createFunction = function () {
      d3.json(_url, function(data_incoming) {
        if(typeof data !== "undefined") {

          // Go one layer in to get right set of values          
          var hash = Hash.parseWithDefault(["fy14-15","expense","fy14-15","generalfund"]);
          var data = d3.nest()
              .key(function(data_incoming) { return d.agency; })
              .key(function(data_incoming) { return d.lob;    })
              .key(function(data_incoming) { return d.program })
              .rollup(function(leaves){"amount": d3.sum(leaves,function(d){ return (parseInt(d.value)}} )})
               .entries(data_incoming);

                console.log("hash",hash);

                // This is a rollup done by hand

                var topLevelBudgetValues = data;
                var title = hashTop.key;

                
                //--------------------------------------------------
                // 'has' filters to validate incoming data and eliminate anything weird
                //--------------------------------------------------
                var hasKey    = R.has("key");
                // var hasData   = R.has("data");
                var hasAmount = R.has("amount");

                // Need new things to validate against...
                var validAxis = function (o) { return hasKey(o) && hasAmount(o.data); };
                
                var filteredBudgetValues = R.filter(validAxis,topLevelBudgetValues);


                var elementToAxis = function (o) {
                  // The data we are taking in is in our standard
                  // Budget tree form, but d3 radar requires
                  // Elements to have a form as below
                  return  { axis:  o.key
                            , value: o.data.amount};
                  
                };


                var getMaximum = function (arr) {            
                  var compareIncomingTakeMax = function (x,y) {return R.max( x, y.value);}
                  var max = R.reduce( compareIncomingTakeMax ,  0 , arr);
                  return max;
                }

                var getSum = function (arr) {

                  var compareIncomingTakeSum = function (x,y) {return x +  y.value;}
                  var sum = R.reduce( compareIncomingTakeSum , 0 , arr);
                  return sum;
                }


                
                var treeDataToAxis = function (arr) { return R.map(elementToAxis,arr);}

                
                var expressAsPercent = function(arr) {                                                                         
                  //Divide each value by the sum for a given array             
                  var sum = getSum(arr);
                  var norm = function (x) { x.value = x.value / sum;
                                            return x;};                                                 

                  var normArr = (R.map(norm,arr));
                  return normArr;
                  
                };
                

                
                // Threshold functions to keep Axis count from getting to be too much                         
                var isAboveThreshold = R.curry(function (threshold,x) { return (x.value) > threshold});          
                var isBelowThreshold = R.curry(function (threshold,x) { return (x.value) <= threshold})
                ;
                var thresholdArrayAndAppend = function (arr) {
                  // return an array where the smallest results are filtered out, but them summed together
                  // and turned into an extra "other" axis.
                  var aboveThresh       = R.filter (isAboveThreshold(_threshold), arr);
                  var belowThreshValArr = R.filter(isBelowThreshold(_threshold))(arr);
                  var belowThreshQty    = belowThreshValArr.length
                  var belowThreshVal    = getSum(belowThreshValArr); 
                  var newOtherPoint     = {axis:"All OTHERS (" + belowThreshQty + ")", value: belowThreshVal};
                  
                  return R.insert( 0,  newOtherPoint, aboveThresh);
                };
                

                var diffValue = function(o1,o2) { o1.value - o2.value}
                var sortArrayByValue = R.sort(diffValue)
                
                // Values are transformed into axis, then normalized, then thresholded. 
                var makeAxisArray         = R.compose(     sortArrayByValue
                                                           , thresholdArrayAndAppend
                                                           , expressAsPercent
                                                           , treeDataToAxis);
                
                var budgetAxis = makeAxisArray(filteredBudgetValues);
                
              }

          var color = d3.scale.ordinal()
              .range( _palette);
          var max = getMaximum(budgetAxis);

          var radarChartOptions = {
            w: _layout.width,
            h: _layout.height,
            margin: margin,
            maxValue: max,
            levels: 5,
            roundStrokes: true,
            color: color
          };
          //Call function to draw the Radar chart
          RadarChart("#radar", [budgetAxis], radarChartOptions);
          
          //Print chart title stupidly
          d3.select("#title").html(title);

        });
             };


      
      //--------------------------------------------------
      // Return config Object
      //--------------------------------------------------
      return { create: createFunction,
               width: function() {
                 if (arguments.length) {
                   _layout.width = arguments[0];
                   return this;
                 }
                 return _layout.width;
               },
               height: function() {
                 if (arguments.length) {
                   _layout.height = arguments[0];
                   return this;
                 }
                 return _layout.height;
               },
               url: function() {
                 if (arguments.length) {
                   _url = arguments[0];
                   return this;
                 }
                 return _url;
               },
               threshold: function() {
                 if (arguments.length) {
                   _threshold = arguments[0];
                   return this;
                 }
                 return _threshold;
               }
               
             };

    }
  })(ob.display);

