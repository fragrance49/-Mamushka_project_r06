// ------------------------ //
// --- Global Variables --- //
// ------------------------ //
let _bDebugMode       = false;  // Is Debug mode on?
let _inputParams      = null;   // map of input (GET) query-parameters
let _jsonConfig       = null;   // global JSON configuration
let _iFormDisplayLock = 0;      // Rating-Form could be displayed when this counter reaches back 0
let _iSelectedRating  = 0;      // number of last rating-button clicked by user (1..N)

// ----------------------- //
// --- Service Methods --- //
// ----------------------- //
function concatLine (str, line)
{
    return ((str === null) || (str.length === 0)) ? line : `${str}\n${line}`;
}

function parseQueryParams (url)
{
    // Parse and get only GET-query substring
    let iQuestionMarkIndex = url.indexOf('?');
    if (iQuestionMarkIndex < 0)
        return {};      // No query-params on input url

    if (iQuestionMarkIndex > 0)
        url = url.substr(iQuestionMarkIndex);
    
    const searchParams = new URLSearchParams(url);
    return Object.fromEntries(searchParams.entries());
}

function parseUrlParams (url)
{    

// ^@ - the user/interface current unique id
// ^E - the current element ID
// ^P - the current Page ID
// ^M - default Mamushka server url
// ^R - previous page url

    let checksymbol = url.substr(0,2);
    const urlarr = url.split("^");
    console.log("length");
    console.log(urlarr.length);
    
    let returnurl = "";
    for(let i=1; i<urlarr.length; i++){
        // console.log(urlarr[i]);
        let strindex = "^" + urlarr[i].charAt(0);
        let suburlstr = _jsonConfig.Rserved_words[strindex] + urlarr[i].substr(1);
        returnurl = returnurl + suburlstr;

    }

    // if(checksymbol.charAt(0)=='^'){
    //     let returnurl = '';   
    //     returnurl = _jsonConfig.Rserved_words[checksymbol] + url.substr(2);
    //     return returnurl;
    // }else{
    //     return url;
    // }
    return returnurl;

    
}

function navigateTo (href)
{
    if (_bDebugMode)
        console.log ("Navigating to: " + href);
    
    if (href)
        document.location.href = href;
}

function preloadImage (imgSrc, loadCallback)
{
    // Load image to memory
    let image = new Image();

    // Set the callback before loading begins, so that quick loading is not missed
    if (loadCallback)
        image.onload = function() { loadCallback(imgSrc); }

    image.src = imgSrc;
}

function onImagePreloadComplete (imgSrc)
{
    if (_bDebugMode)
        console.log ("Image preloaded: " + imgSrc);
}

/**
 * Gets HTML element's left/right padding (assuming they're equal).
 * If 'padding' CSS-attribute hasn't been set or is non-available (such as on Firefox), the value of CSS 'padding-left' or 'padding-right' shall be used.
 * 
 * @param   elem an element on DOM
 * @returns element's sideways-padding (integer), or undefined - if padding could not be determined
*/
function getWidthPadding (elem)
{
    let szPadding = $(elem).css('padding');

    if (!szPadding)
    {
        szPadding = $(elem).css('padding-left');

        if (!szPadding)
            szPadding = $(elem).css('padding-right');

        if (!szPadding)
            return undefined;
    }

    // else...
    return parseInt(szPadding.replace(/[^-\d\.]/g, ''));    // Remove all non-digits, non-dots, and not-minus-sign. Usage of 'parseInt' is redundant!
}

// ---------------------- //
// --- Helper Methods --- //
// ---------------------- //
function determineConfigSource (queryParams)
{
    if (queryParams)
    {
        // Fetch by configuration-ID [CID]
        if (queryParams['cid'])
        {
            const szCID = queryParams['cid'];
            if (!__mapCidToPath[szCID])
            {
                alert (`No configuration matching CID '${szCID}' was found`);
                return null;
            }
            else
                return __mapCidToPath[szCID];
        }

        // Fetch by configuration-file name [CFN]
        if (queryParams['cfn'])
            return './json/' + queryParams['cfn'] + '.json';
        if (queryParams['qjson'])
            return queryParams['qjson'];
    }

    // Default configuration
    // return './json/default.json';
    // return './json/test.json';
}

function buildTargetUrl (urlBase)
{
    let url            = new URL(urlBase);
    let existingParams = parseQueryParams(urlBase);
    let bCfgSpecExists = existingParams.hasOwnProperty('cid') || existingParams.hasOwnProperty('cfn');

    // Add all relevant input query-parameters
    for (let paramID in _inputParams)
    {
        if ((paramID === 'debug') || (paramID === 'rating'))
            continue;

        if (bCfgSpecExists && ((paramID === 'cid') || (paramID === 'cfn')))
            continue;   // Target-url (base) already includes a configuration-spec (CID or CFN)
        
        if (existingParams.hasOwnProperty(paramID))
            continue;   // Parameter of this name already exists on target-url (i.e. on its base)

        // else, add parameter to target-url
        url.searchParams.append (paramID, _inputParams[paramID]);
    }

    // Remove any existing 'rating' parameter from target-url (base)
    url.searchParams.delete ('rating');

    // Add selected rating
    url.searchParams.append ('rating', _iSelectedRating);

    // Return complete target-url
    return url.href;
}

function updateFormDisplayCounter (offset)
{
    if (_iFormDisplayLock < 0)
        return;     // Form is already displayed. Ignore...
    
    _iFormDisplayLock += offset;

    if (_iFormDisplayLock === 0)
    {
        if (_bDebugMode)
            console.log ("Rating form is being displayed");
        
        // Show the rating-form (in a fade-in effect)
        $(".ratingForm").fadeIn (_jsonConfig.design.fadeInDuration ? _jsonConfig.design.fadeInDuration : 0);
        _iFormDisplayLock = -1; // To prevent further display ops
    }
}

function setSelectedRating (rating)
{
    if ((rating < 1) || (rating > _jsonConfig.design.numberRateButtons))
    {
        if (_bDebugMode)
            console.log (`setSelectedRating: Input-rating ${rating} is out of range`);
        
        return; // Ignore this call, as input-rating is out of range
    }

    // else (i.e. input-rating is in-range)
    updateRateButtonImage (rating);
}

// ------------------------- //
// --- UI Helper-Methods --- //
// ------------------------- //
function composeRateButtonImageID (buttonID)
{
    return "rateButtonBckg_" + buttonID;
}

function updateRateButtonImage (buttonID)
{
    _iSelectedRating = buttonID;

    // Set rate-buttons images
    let szBckgImageID = composeRateButtonImageID(buttonID);
    let szImagePath   = _jsonConfig.defaultAnswerButton.selectedImage;
 
   
    $('.rateButtonBckg').attr("src", _jsonConfig.defaultAnswerButton.Object_Media.idle); // Reset all rate-button images (to the Idle-state image)
    $('#' + szBckgImageID).attr("src", szImagePath);                    // Set image of clicked rate-button (to the Selected-state image)

    
        
    
    
}

// ------------------------------------------------ //
// --- Dynamic Layout & Configuration (by JSON) --- //
// ------------------------------------------------ //
// Auto-calculates and sets rate-buttons (maximal allowed) width. Height is set to the same value.
function resizeRateButtons ()
{
    // Note: Rating-Form's full-width is set (by CSS) to 90vw, but don't assume that. CALCULATE its relative-width (in ViewPort-width units).
    //       All rate-buttons + 2 thumb-buttons should fit within this width.
    let szFormTotalWidth   = $('.ratingForm').css('width');
    let iFormTotalWidth_px = parseInt(szFormTotalWidth.replace(/[^-\d\.]/g, ''));   // Remove all non-digits, non-dots, and not-minus-sign. Usage of 'parseInt' is redundant!
    let iFormPadding_px    = getWidthPadding('.ratingForm');
    
    let fFormNetWidth_vw = (iFormTotalWidth_px - iFormPadding_px) / window.innerWidth * 100;                // in percent <==> vw units
    let iDim             = Math.floor(fFormNetWidth_vw / (_jsonConfig.design.numberRateButtons + 2)) - 1;   // to overcome browser floating-point inaccuracies [width-"lossy" for large number of buttons]
    let iFontSize        = Math.round(iDim / 2);

    if (_bDebugMode)
    {
        console.log (`Rating-Form Total/Padding Width = ${iFormTotalWidth_px}/${iFormPadding_px}[px]. Window-Inner-Width = ${window.innerWidth}[px]`);
        console.log (`Rating-Form (Calculated) Relative Net-Width = ${fFormNetWidth_vw}[vw]`);
    }
    
    $(':root').css('--buttonBox_dim', iDim + 'vw');
    $(':root').css('--buttonBox_fontSize', iFontSize + 'vw');

    if (_bDebugMode)
        console.log (`Rate-buttons Dim/Font-Size = ${iDim}/${iFontSize}[vw]`);
}


// Preloads event-related images, for improved user-experience
function preloadImages ()
{
    // Images order in array is according to an estimated order of need for their (actual) display!
    const arImagePaths = [_jsonConfig.defaultAnswerButton.Object_Media.hover, _jsonConfig.defaultAnswerButton.selectedImage,
                          _jsonConfig.prev_button.Object_Media, _jsonConfig.next_button.Object_Media];

    let iNumValidImages = 0;
    
    for (let szImagePath of arImagePaths)
    {
        if (!szImagePath)
            continue;   // Ignore any undefined, null or zero-length image-path
        
        preloadImage (szImagePath, onImagePreloadComplete);
        iNumValidImages++;
    }

    if (_bDebugMode)
        console.log (`Preloading ${iNumValidImages} images`);
}

function createButtons ()
{
    // --- Create Rate (nunber) buttons ---
    let szButtonBoxesHTML = "";

  

    // Create rate-buttons
    for (let i = 0; i < _jsonConfig.design.numberRateButtons; i++)
    {
        let iButtonNumber = i + 1;
        // let srcobj = '_jsonConfig.rateButton' + iButtonNumber;
        let srcobj = 'answerButton' + iButtonNumber;
        console.log("ooo");
        szButtonBoxesHTML +=
            `<div class="buttonBox rateButtonBox" id="answerButton${iButtonNumber}" style="width:${_jsonConfig.defaultAnswerButton.XSize}; font-size:${_jsonConfig.defaultTextProperties.size}; font-family:${_jsonConfig.defaultTextProperties.font}; color : ${_jsonConfig.defaultTextProperties.color}" >` +
                `<img  src="${parseUrlParams(_jsonConfig.defaultAnswerButton.Object_Media.idle)}" class="BtnBg">`+
                `<img id="${composeRateButtonImageID(iButtonNumber)}" class="rateButtonBckg" src="${_jsonConfig[srcobj].Object_Media.idle}">` +
                `<span class="rate_txt"  id="rate_${iButtonNumber}">${_jsonConfig[srcobj].AnswerText}</span>` +
            `</div>`;
    }

    // Auto-resize rate-buttons
    // resizeRateButtons();



    // Apply to DOM
    $('#rateButtonsContainer').html(szButtonBoxesHTML);

    // --- Set images of prev/next (thumb) buttons ---
    $('#nextButton').attr('src', parseUrlParams(_jsonConfig.next_button.Object_Media.idle));
    $('#nextButton').css({width: _jsonConfig.next_button.XSize});
    $('#prevButton').css({width: _jsonConfig.prev_button.XSize});
    // $(element).css({ width: '300px', 'padding-top': '10px', 'padding-bottom': '10px' });
     $('#prevButton').attr('src', parseUrlParams(_jsonConfig.prev_button.Object_Media.idle));
}

function applyDesign ()
{
    // HTML Title
    if (_jsonConfig.design.pageTitle)
        document.title = _jsonConfig.design.pageTitle;

    // Intro Animation
    const introAnimImg = $("#introAnimation");

    if (_jsonConfig.design.introAnimation)
    {
        // Stall the display of the rating-form
        updateFormDisplayCounter (1);
        
        introAnimImg.on ('load', function()
        {
            if (_jsonConfig.design.introAnimDuration)
            {
                if (_bDebugMode)
                    console.log ("Intro-Animation: Start");

                // Hide the animation <img>-element once its playing has been complete
                setTimeout (function()
                {
                    introAnimImg.hide();
                    
                    if (_bDebugMode)
                        console.log ("Intro-Animation: End");

                }, _jsonConfig.design.introAnimDuration);
            }

            // Show the rating-form (if there are no further restrictions)
            updateFormDisplayCounter (-1);
        });
        
        // Load animation source
        introAnimImg.attr('src', _jsonConfig.design.introAnimation);
    }
    else
        introAnimImg.hide();
    
    // Body Background-Color
    if (_jsonConfig.design.bodyBckgColor)
        $('body').css('backgroundColor', _jsonConfig.design.bodyBckgColor);

    // Body Background-Images
    if (_jsonConfig.design.bodyBckgImages)
    {
        let szImagesUrlList = "";

        if (_jsonConfig.design.bodyBckgImages instanceof Array)
        {
            for (let szImagePath of _jsonConfig.design.bodyBckgImages)
                szImagesUrlList += ((szImagesUrlList.length > 0) ? ", " : "") + `url('${szImagePath}')`;
        }
        else
            szImagesUrlList = `url('${_jsonConfig.design.bodyBckgImages.trim()}')`;

        $('.ratingForm').css('background-image', szImagesUrlList);
    }

    // Form-Border Styling
    if (_jsonConfig.design.formBorder_style)
        $('.ratingForm').css('border', _jsonConfig.design.formBorder_style.trim());


    // main question: Content & Design (CSS)
    if (_jsonConfig.main_question && _jsonConfig.main_question.text)
    {
        $('#main_question').html(_jsonConfig.main_question.text.trim());

        if (_jsonConfig.main_question.Object_Media){
            let szquHTML = "";
            szquHTML +=     
            `<div class="mqimg">
                <img class="" src="${parseUrlParams(_jsonConfig.main_question.Object_Media.background)}">`+
                `<div class="img_text" >י${_jsonConfig.main_question.text}</div> </div>`;
            // Apply to DOM
            $('#main_question').html(szquHTML);
            // $('#main_question').attr('background', _jsonConfig.comment.Object_Madia.background);
            $('#main_question').css({width: _jsonConfig.main_question.XSize, height :_jsonConfig.main_question.YSize});

        }

    }
    else
        $("#main_question").hide();

     if (_jsonConfig.main_points_counter && _jsonConfig.main_points_counter.text)
    {
        $('#main_points_counter').html(_jsonConfig.main_question.text.trim());

        if (_jsonConfig.main_points_counter.Object_Media){
            let scountHTML = "";
            scountHTML +=     
            `<div class="mqimg">
                <img class="" src="${parseUrlParams(_jsonConfig.main_points_counter.Object_Media.background)}">`+
                `<div class="img_text" >י${_jsonConfig.main_points_counter.text}</div> </div>`;
            // Apply to DOM
            $('#main_points_counter').html(scountHTML);

            $('#main_points_counter').css({width: _jsonConfig.main_points_counter.XSize, height :_jsonConfig.main_points_counter.YSize});
        }

    }
    else
        $("#main_points_counter").hide();


}

function applyButtonBehavior ()
{    

    let panels;


   if (_jsonConfig.default_panel_button.Object_Media.hover)
    {
        $('.panelbtn')
            .hover (function()
            {
                if (!$(this).attr('id').endsWith(_iSelectedRating))
                    panels = $(this).attr('id');
                    console.log("id");
                    console.log(panels);
                    $(this).find('.lowButtonBckg').attr('src', parseUrlParams(_jsonConfig.default_panel_button.Object_Media.hover));
            })
            .mouseleave (function()
            {
                if (!$(this).attr('id').endsWith(_iSelectedRating))
                    $(this).find('.lowButtonBckg').attr('src', parseUrlParams(_jsonConfig[panels].Object_Media.idle));
            });
    }


}

function applyNavigation ()
{
    if (_jsonConfig.prev_button.Object_Media.pressURL){
        console.log("prev");
        $('#prevButton').click (function() {
         navigateTo(parseUrlParams(_jsonConfig.prev_button.Object_Media.pressURL)); 
        });
    }

    if (_jsonConfig.next_button.Object_Media.pressURL)
        $('#nextButton').click (function()
        {
           navigateTo(parseUrlParams(_jsonConfig.next_button.Object_Media.pressURL));

        });

    for (let i = 0; i < _jsonConfig.design.numberPanelButtons; i++){
        let ipNumber = i + 1;
        let srcobj = 'panel_button' + ipNumber;
        if(_jsonConfig[srcobj].Object_Media.pressURL){
            let idname = '#' + srcobj;
           $(idname).click(function(){

            navigateTo(_jsonConfig[srcobj].Object_Media.pressURL);
           })
        }
    }
}

function applyBPanel(){

    // --- Create Rate (nunber) buttons ---
    let spanelsHTML = `<img class="panel_img" src="${parseUrlParams(_jsonConfig.lower_panel.Object_Media.background)}">`; 

    // Create rate-buttons
    for (let i = 0; i < _jsonConfig.design.numberPanelButtons; i++)
    {
        let ipNumber = i + 1;
        let srcobj = 'panel_button' + ipNumber;
        spanelsHTML +=
            `<div class="buttonBox panelbtn" id="panel_button${ipNumber}" style="width:${_jsonConfig.default_panel_button.XSize}">`+
                `<img class="lowButtonBckg " src="${parseUrlParams(_jsonConfig[srcobj].Object_Media.idle)}">`+       
            '</div>';

            
    }

    // Auto-resize rate-buttons
    // resizeRateButtons();


    // Apply to DOM
    $('#lowpanelContainer').html(spanelsHTML);

}

function applyConfiguration ()
{
    // Preload images (for better user experience)
    preloadImages();
    
    // Create buttons
    createButtons();

    //Apply bottom panel
    applyBPanel();

    // Apply general design
    applyDesign();

    // Apply button behavior
    applyButtonBehavior();

    // Apply navigation
    applyNavigation();

    
}

function validateConfiguration ()
{
    let szErrors = "";
    
    if (!_jsonConfig.design)     szErrors = concatLine(szErrors, "'design' section is missing");
    if (!_jsonConfig.defaultAnswerButton) szErrors = concatLine(szErrors, "'defaultAnswerButton' section is missing");
    // if (!_jsonConfig.signButton) szErrors = concatLine(szErrors, "'signButton' section is missing");
    // if (!_jsonConfig.navigation) szErrors = concatLine(szErrors, "'navigation' section is missing");

    if (szErrors)
        return szErrors;

    if (!_jsonConfig.design.numberRateButtons)   szErrors = concatLine(szErrors, "'design.numberRateButtons' is missing");
    if (!_jsonConfig.defaultAnswerButton.Object_Media)       szErrors = concatLine(szErrors, "'defaultAnswerButton.Object_Media' is missing");
    // if (!_jsonConfig.signButton.plus_idleImage)  szErrors = concatLine(szErrors, "'signButton.plus_idleImage' is missing");
    // if (!_jsonConfig.signButton.minus_idleImage) szErrors = concatLine(szErrors, "'signButton.minus_idleImage' is missing");

    return (szErrors === "") ? null : szErrors;
}

function isConfigurationValid ()
{
    return (validateConfiguration() === null);
}

// ------------------------------- //
// --- Script Main Entry-Point --- //
// ------------------------------- //
// Parse (GET) query-parameters
_inputParams = parseQueryParams(window.location.search);

// Determine (JSON) configuration-source
const szConfigSrc = determineConfigSource(_inputParams);
if (szConfigSrc === null)
    throw new Error('input-configuration missing');

$(document).ready (function()
{
    // Stall the display of the rating-form
    updateFormDisplayCounter (1);
    
    // Load the input configuration-JSON
    $.getJSON (szConfigSrc, function(data)
    {
        // Should Debug mode be turned on?
        if (_inputParams.hasOwnProperty('debug'))
            _bDebugMode = _bDebugMode || Boolean(_inputParams['debug']);    // Not using the ||= operator, as it is not supported by some JS minifiers
        else if (data.hasOwnProperty('debugMode'))
            _bDebugMode = _bDebugMode || Boolean(data.debugMode);           // Not using the ||= operator, as it is not supported by some JS minifiers
        
        // Debug logs
        if (_bDebugMode)
        {
            console.log ("Debug Mode: On");
            console.log ("URL: " + window.location.href);
            console.log (`Config '${szConfigSrc}':`);
            console.log (data);
        }

        // Keep input-configuration object
        _jsonConfig = data;

        // Validate loaded configuration
        let szConfigErrors = validateConfiguration();
        
        // Handle validation result
        if (szConfigErrors == null)
        {
            // Apply configuration and show the rating-form (if there are no further restrictions)
            applyConfiguration();
            updateFormDisplayCounter (-1);
        }
        else
        {
            let szMsg = `NOTICE: Input configuration is invalid.\n\n` + `Errors:\n${szConfigErrors}`;
            alert (szMsg);
        }
    }).fail (function() { alert(`Failed fetching configuration file '${szConfigSrc}'`); });
});