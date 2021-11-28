import { list } from './data.js'
import 'regenerator-runtime/runtime'
import jQuery from "jquery";
import Viva from 'vivagraphjs'
// import 'regenerator-runtime/runtime'
const $ = jQuery.noConflict();

$(document).ready(function() {

let params = new URL(document.location).searchParams;
let queryString = params.get("query");

  
  var graph = Viva.Graph.graph();


  var searchEle = document.querySelector(".search"),
    result = document.querySelector(".result");

  function doSearch() {
    var resultJSON = fuse.search(searchEle.value);
    let r = JSON.stringify(resultJSON, null, 3);
    r = [...resultJSON];
    let val = ``;
    for (let i in r) {
      // Replace spaces with plus for query string
      let qs = list[r[i]];
      qs = qs.split(" ").join("+");
      val += `<li class="search-item"> <a href="?query=${qs}">${
        list[r[i]]
      }</a></li>`;
    }
    result.innerHTML = val;
  }

  var options = {
    shouldSort: true,
    matchAllTokens: true,
    findAllMatches: true,
    threshold: 0.4,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
  };
  var fuse = new Fuse(list, options);

  searchEle.addEventListener("input", doSearch);
  doSearch();

  let searchInput = document.querySelector(".search");
  let searchResult = document.querySelector("#search-result");
  let searchBox = document.querySelector("#search");
  searchInput.addEventListener("focus", () => {
    //searchResult.style.position = "absolute"
  });

  searchInput.addEventListener("blur", () => {
    //searchInput.value = ""
    //searchResult.style.position = "relative"
  });

  let enableSubgraph = document.getElementById(`subgraph`);

  buildGraph();

  function buildGraph() {
    getWikiLinks(queryString);
    console.log(queryString);

    async function getWikiLinks(qString) {

      let loading = document.getElementById("loading");
      loading.innerHTML = "fetching data...";
      var pageName = qString;
      var url = `https://en.wikipedia.org/w/api.php?format=json&origin=*&action=parse&prop=links&page=${pageName}&redirects`;
      let matches = [];
      let toExclude = new RegExp(`${pageName}`, "i");
      var toExclude1 =
        /(proof|fiction|disambiguation|introduction|book|theorems|prove|proving|metatheorem|math|template|talk|theory\))/gi;
      const linkData = await fetch(url).then((response) => response.json());

      for (var i in linkData.parse.links) {
        // Match values containing a string, space plus the word "theorem"
        let link = linkData.parse.links[i]["*"];
        var re = /([\w\s]+(theorem|lemma|correspondence))/gi;
        if (!toExclude.test(link) && !toExclude1.test(link) && re.test(link)) {
          matches.push(link);
        }
      }
      let allResults = [];

      if (enableSubgraph.checked == true) {
        for (let j in matches) {
          var pageName1 = `${matches[j]}`;
          var url1 = `https://en.wikipedia.org/w/api.php?format=json&origin=*&action=parse&prop=links&page=${pageName1}&redirects`;
          let related = [];
          related.push(pageName1);
          let toExclude1 = new RegExp(`${pageName1}`, "i");
          const linkData1 = await fetch(url1).then((response) =>
            response.json()
          );
          for (var k in linkData1.parse.links) {
            // Match values containing a string, space plus the word "theorem"
            let link1 = linkData1.parse.links[k]["*"];
            var re1 =
              /([\w\s]+(theorem|algorithm|lemma|inequality|conjecture|axiom|corollary|correspondence))/gi;
            var toExclude2 =
              /(proof|fiction|disambiguation|list|analysis of|method of|introduction|book|metatheorem|theorems|template|prove|proving|math|talk|theory\))/gi;
            var toExclude3 = new RegExp(`${pageName1}|${pageName}`, "i");
            if (
              re1.test(link1) &&
              !toExclude1.test(link1) &&
              !toExclude2.test(link1) &&
              !toExclude3.test(link1)
            ) {
              related.push(link1);
            }
          }
          allResults.push(related);
        }
      } else {
        allResults.push(matches);
      }


      // Construct the graph

      let parentText = pageName;

      if (allResults.length > 0) {
        
        graph.addNode("parent", {
          text: parentText,
          cn: "red",
          strokeClass: "red-stroke",
        });
        if (enableSubgraph.checked == true) {
          for (let item in allResults) {
            let branch = allResults[item];
            // Set the first array items as the main branches
            graph.addNode(branch[0], {
              text: branch[0],
              cn: "red",
              strokeClass: "red-stroke",
            });
            graph.addLink("parent", branch[0], { cn: "red-stroke" });
  
            // generate sub branches
            for (let sub = 1; sub < branch.length; sub++) {
              graph.addNode(branch[sub], { text: branch[sub] });
              graph.addLink(branch[0], branch[sub], { cn: "gray" });
            }
          }
        }
        else {
          let branch = allResults[0];
          for (let item in branch) {
            graph.addNode(branch[item], {
              text: branch[item],
              cn: "red",
              strokeClass: "red-stroke",
            });
            graph.addLink("parent", branch[item], { cn: "red-stroke" });
          }
        }
        
        loading.innerHTML = "";
      } else {
        let container = document.getElementById("graphDiv");
        let el = document.createElement("div");
        el.setAttribute("class", "empty-container");
        // Hide loading text
        loading.innerHTML = "";

        // Show different empty states based on query string
        if (queryString) {
          el.innerText = "No relationships found";
        } else {
          el.innerText =
            "Visualizations of theorem relationships using graphs.";
        }
        container.appendChild(el);
        //document.querySelector('svg').remove();
      }

      // Canvas only used to calculate text width
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext("2d");
      // Give text a size of 40px and assign it the selected font
      let textSize = `20px`;
      ctx.font = `${textSize}`;

      // Set custom nodes appearance
      var graphics = Viva.Graph.View.svgGraphics();
      graphics
        .node(function (node) {
          let pos = layout.getNodePosition(node.id);
          // Get width of the text
          let text = ctx.measureText(`${node.data.text}`);
          let textWidth = text.width;

          let g = Viva.Graph.svg("g").attr("width", "auto").attr("height", 20);
          g.append("rect")
            .attr("width", textWidth * 2.2)
            .attr("height", 40)
            .attr("class", `bbox ${node.data.strokeClass}`)
            .attr("y", -30)
            .attr("x", -10);
          g.append("text")
            .attr("class", `dataText ${node.data.cn}`)
            .text(node.data.text);

          // The function is called every time renderer needs a ui to display node
          return g;
          //.link(node.data.url); // node.data holds custom object passed to graph.addNode();
        })
        .placeNode(function (nodeUI, pos) {
          // Shift text to let links go to the center:
          nodeUI.attr("transform", `translate(${pos.x}, ${pos.y})`);
        });

      let color;

      graphics
        .link(function (link) {
          return Viva.Graph.svg("path")
            .attr("stroke", "gray")
            .attr("stroke-width", "3")
            .attr("class", `${link.data.cn}`);
        })
        .placeLink(function (linkUI, fromPos, toPos) {
          // linkUI - is the object returned from link() callback above.
          var data =
            "M" + fromPos.x + "," + fromPos.y + "L" + toPos.x + "," + toPos.y;

          // 'Path data' (http://www.w3.org/TR/SVG/paths.html#DAttribute )
          // is a common way of rendering paths in SVG:
          linkUI.attr("d", data);
        });

      let sLength = 600;
      if (allResults.length > 4) {
        sLength = 900;
      }
      var layout = Viva.Graph.Layout.forceDirected(graph, {
        springLength: sLength,
        springCoeff: 0.0008,
        dragCoeff: 0.02,
        gravity: -10.2,
      });

      var renderer = Viva.Graph.View.renderer(graph, {
        graphics: graphics,
        container: document.getElementById("graphDiv"),
        layout: layout,
      });
      renderer.run();


    }

  }


});
