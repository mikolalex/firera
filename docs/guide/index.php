<?php
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';
$chapters = array();

function chapter($rozdil, $name, $caption) {
    global $chapters;
    global $chapter;
    if (!isset($chapters[$rozdil])) {
        $chapters[$rozdil] = array();
    }
    $chapters[$rozdil][$name] = $caption;
    if ($name === $chapter)
        return true;
}

$codes = array();
$code_ids = 0;

function regshow($name, $code, $diffname = null) {
    global $code_ids;
    global $codes;
    echo'<code id="codepiece' . ++$code_ids . '"></code>';
    $codes[$name] = array($code, $code_ids, $diffname);
}

ob_start();

include("chapters_en.php");

$out = ob_get_contents();
ob_end_clean();
?>
<!DOCTYPE html>
<!--
To change this license header, choose License Headers in Project Properties.
To change this template file, choose Tools | Templates
and open the template in the editor.
-->
<html>
    <head>
        <title>Firera tutorial</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="../guide.css" />
        <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.8.0/styles/default.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.8.0/highlight.min.js"></script>
        <script src="/bower_components/jsdiff/diff.min.js">
            <script src="../firera.js"></script>
	<script>
		var module = {

			};
	</script>
        <script src="text-diff.js"></script>
            <style>
                #content > * {
                    padding: 50px 40px 40px 66px;
                    background-color: white;
                    margin-top: 3em;
                    margin-bottom: 3em;
                }

                html {
                    /*min-height: 100%;
                    background-color: #b7d1e4;*/
                }

                .exp {
                    width: 100%;
                    background-color: white;
                    border-top: 1px solid #b7d1e4;
                    border-bottom: 1px solid #b7d1e4;
                    margin-top: 50px;
                }

                .sub-exp {
                    max-width: 800px;
                    margin: auto;
                }
                .sub-exp > ul {
                    margin: 0px;
                    padding-left: 120px;
                }
                .sub-exp > ul > li a {
                    color: black;
                    text-decoration: none;
                }
                .sub-exp > ul > li {
                    float: right;
                    list-style: none;
                    width: 167px;
                    text-align: center;
                    height: 20px;
                    padding-top: 60px;
                }

                .titl a {
                    color: white;
                    text-decoration: none;
                    font-style: italic;
                }

                .titl {
                    width: 120px;
                    text-align: center;
                    background-color: #b7d1e4;
                    color: white;
                    text-transform: uppercase;
                    padding: 30px 0px;
                    font-size: 15px;
                    line-height: 15px;
                }

                body {
                    margin: 0px;
                }
                
                .addd {
                    background-color: #c1eaa8;
                }
                .rmvd {
                    background-color: #f99686;
                }
                
                .hljs-number.hljs-number {
                    color: #03a7e8;
                }

                
/* STYLE 2 

code, code.hljs {
    padding: 0px 0px 20px 20px;
    display: block;
    background-color: #6d615d;
    font-family: monospace;
    white-space: pre;
    margin: 1em 0;
    overflow-x: auto;
    font-size: 14px;
    line-height: 19px;
    border-radius: 10px;
    color: wheat;
}
.hljs-number.hljs-number.hljs-number {
    color: #84dcff;
}
.hljs-string.hljs-string.hljs-string {
    color: #f57575;
}
.addd {
    background-color: #1d4c00;
}
.rmvd {
    background-color: #841200;
}
.hljs-built_in.hljs-built_in {
    color: #c1ff84;
}*/
            </style>
        </head>
        <body>
            <div class="to-main">
                <a href="../index.html">
                    <span style="font-size:11px">&larr;</span> &nbsp;&nbsp;to main page
                </a>
            </div>
            <!--<div class="exp">
                    <div class="sub-exp">
                            <ul>
                                    <li>
                                            Discussion
                                    </li>
                                    <li>
                                            Repo
                                    </li>
                                    <li>
                                            <a href="install.html">Install</a>
                                    </li>
                                    <li>
                                            <a href="guide.html">Tutorial</a>
                                    </li>
                            </ul>
                            <div class="titl">
                                    <a href="index.html">Firera -
                                    Javascript
                                    Functional
                                    Reactive
                                    Declarative
                                    Framework</a>
                            </div>
                    </div>-->

            <div id="content">
                <div class="always-header">
                    <h1>Firera tutorial</h1>
                    <hr>
                    <h2>
                        Table of contents
                    </h2>
                    <ul class="toc">
                        <?php
                        $prev = false;
                        $real_prev = false;
                        $real_next = false;
                        $prev_name = false;
                        foreach ($chapters AS $rozdil => $subchapters) {
                            ?>
                            <li>

                                <? echo $rozdil; ?>

                                <ul><?
                                    foreach ($subchapters AS $url => $name) {
                                        //echo'<pre>'; print_r($url);print_r($name); echo'</pre>';
                                        ?>
                                        <li>
                                            <?
                                            if ($prev === $chapter) {
                                                $real_next = $url;
                                                $real_next_name = $name;
                                            }
                                            if ($url !== $chapter) {
                                                ?><a href="./<? echo $url; ?>"><?
                                            } else {
                                                $real_prev = $prev;
                                                $real_prev_name = $prev_name;
                                                echo'<span class="active">';
                                            }
                                                ?>
                                            <? echo $name; ?>
                                            <? if ($url !== $chapter) { 
                                                ?></a><?
                                            } else {
                                                echo'</span>';
                                            }
                                            $prev = $url;
                                            $prev_name = $name;
                                            ?>
                                        </li>
        <?
    }
    ?>
                                </ul>
                            </li>
                            <?
                            if ($url === 'final_app') {
                                //echo'</ul><ul class="toc">';
                            }
                        }
                        ?>
                    </ul>
                    <div id="very-content"></div>
                </div>
                <?php
                echo $out;
                ?>
                <div class="prevnext">
                    <div>
                            <? if ($real_prev !== false) { ?>
                            &#8630; <a href="./<? echo $real_prev; ?>">
    <? echo $real_prev_name; ?>
                            </a>

<? } ?>
                    </div>
                    <div>
                            <? if ($real_next) { ?>
                            <a href="./<? echo $real_next; ?>">
    <? echo $real_next_name; ?>
                            </a>
                            &#8608;
<? } ?>
                    </div>
                    <div style="clear:both;float:none;"></div>
                </div>
            </div>
<script>
    $(document).ready(function() {
        var body = document.body; 
        //body.scrollTop = document.querySelector('#content').children[1].offsetTop;
        
        $('code').each(
                function(i, block) {
                    hljs.highlightBlock(block);
                }
        );
    });
	
    $('.q').click(function(){
        $(this).parent().find('.answer').toggle();
    })

    var codepieces = <?php echo json_encode($codes); ?>;
    for(var i in codepieces){
        var piece = codepieces[i];
        var code = piece[0];
        var id = piece[1];
        var diff_to = piece[2];
        if (!diff_to){
            $("#codepiece" + id).html(code);
        } else {
            var diff = JsDiff.diffLines(codepieces[diff_to][0], code);
            var res = diff.map((piece) => {
                var cls = piece.removed ? 'rmvd' : (piece.added ? 'addd' : '');
                return '<span class="' + cls + '">' + piece.value + '</span>';
            })
            console.log('D', code, codepieces[diff_to][0], diff);
            $("#codepiece" + id).html(res.join(''));
        }
    }
</script>
        </body>
    </html>
