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
    }

    // Default configuration
    return './json/default.json';
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
    let szImagePath   = _jsonConfig.rateButton.selectedImage;

    $('.rateButtonBckg').attr("src", _jsonConfig.rateButton.idleImage); // Reset all rate-button images (to the Idle-state image)
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
    const arImagePaths = [_jsonConfig.rateButton.hoverImage, _jsonConfig.rateButton.selectedImage,
                          _jsonConfig.signButton.plus_selectedImage, _jsonConfig.signButton.minus_selectedImage];

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

        szButtonBoxesHTML +=
            `<div class="buttonBox rateButtonBox" id="rateButtonBox_${iButtonNumber}">` +
                `<img id="${composeRateButtonImageID(iButtonNumber)}" class="rateButtonBckg" src="${_jsonConfig.rateButton.idleImage}">` +
                `<button OnClick="updateRateButtonImage(${iButtonNumber})" id="rate_${iButtonNumber}">${iButtonNumber}</button>` +
            `</div>`;
    }

    // Auto-resize rate-buttons
    resizeRateButtons();

    // Apply to DOM
    $('#rateButtonsContainer').html(szButtonBoxesHTML);

    // --- Set images of Plus/Minus (thumb) buttons ---
    $('#rightThumbImg').attr('src', _jsonConfig.signButton.plus_idleImage);
     $('#leftThumbImg').attr('src', _jsonConfig.signButton.minus_idleImage);
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

    // Title: Content & Design (CSS)
    if (_jsonConfig.title && _jsonConfig.title.text)
    {
        $('#title').html(_jsonConfig.title.text.trim());

        if (_jsonConfig.title.style)
            $('#title').attr('style', _jsonConfig.title.style);

        if (_jsonConfig.title.shadow)
            $("#title").css('text-shadow', _jsonConfig.title.shadow);

        // RTL is set last, to overrule preceding 'style' setting
        if (_jsonConfig.title.rtl)
            $("#title").css('direction', 'rtl');
    }
    else
        $('#title').hide();

    // Comment: Content & Design (CSS)
    if (_jsonConfig.comment && _jsonConfig.comment.text)
    {
        $('#comment').html(_jsonConfig.comment.text.trim());

        if (_jsonConfig.comment.style)
            $('#comment').attr('style', _jsonConfig.comment.style);

        if (_jsonConfig.comment.shadow)
            $("#comment").css('text-shadow', _jsonConfig.comment.shadow);

        // RTL is set last, to overrule preceding 'style' setting
        if (_jsonConfig.comment.rtl)
            $("#comment").css('direction', 'rtl');
    }
    else
        $("#comment").hide();

    // Navigation Buttons: Set (Background) Images
    if (!_jsonConfig.navigation.prevImage || !_jsonConfig.navigation.prevUrl)   // Display 'Previous' Button?
        $('#prevButton').hide();
    else
        $('#prevButton').css('background-image', `url('${_jsonConfig.navigation.prevImage}')`);

    if (!_jsonConfig.navigation.nextImage || !_jsonConfig.navigation.nextUrl)   // Display 'Next' Button?
        $('#nextButton').hide();
    else
        $('#nextButton').css('background-image', `url('${_jsonConfig.navigation.nextImage}')`);
}

function applyButtonBehavior ()
{
    if (_jsonConfig.rateButton.hoverImage)
    {
        $('.rateButtonBox')
            .hover (function()
            {
                if (!$(this).attr('id').endsWith(_iSelectedRating))
                    $(this).find('.rateButtonBckg').attr('src', _jsonConfig.rateButton.hoverImage);
            })
            .mouseleave (function()
            {
                if (!$(this).attr('id').endsWith(_iSelectedRating))
                    $(this).find('.rateButtonBckg').attr('src', _jsonConfig.rateButton.idleImage);
            });
    }
    
    $('#rightThumbImg').click (function()
    {
        if (_jsonConfig.signButton.plus_selectedImage)
        {
            $('#leftThumbImg').attr('src', _jsonConfig.signButton.minus_idleImage);
                        $(this).attr('src', _jsonConfig.signButton.plus_selectedImage);
        }

        // Update selected rating (increase by 1)
        setSelectedRating ((_iSelectedRating === 0) ? _jsonConfig.design.numberRateButtons : (_iSelectedRating + 1));
    });
    
    $('#leftThumbImg').click (function()
    {
        if (_jsonConfig.signButton.minus_selectedImage)
        {
            $('#rightThumbImg').attr('src', _jsonConfig.signButton.plus_idleImage);
                        $(this).attr('src', _jsonConfig.signButton.minus_selectedImage);
        }

        // Update selected rating (decrease by 1)
        setSelectedRating ((_iSelectedRating === 0) ? 1 : (_iSelectedRating - 1));
    });
}

function applyNavigation ()
{
    if (_jsonConfig.navigation.prevUrl)
        $('#prevButton').click (function() { navigateTo(_jsonConfig.navigation.prevUrl); });

    if (_jsonConfig.navigation.nextUrl)
        $('#nextButton').click (function()
        {
            // Report User-Rating & Navigate to Next-URL
            if (_jsonConfig.navigation.reportUrl)
            {
                const szReportUrl = buildTargetUrl(_jsonConfig.navigation.reportUrl);

                if (_bDebugMode)
                    console.log ("Reporting to: " + szReportUrl);

                // Report asynchronously using an AJAX request
                let jqXhr = $.ajax(szReportUrl).always (function(data, status, error)
                {
                    if (_bDebugMode)
                    {
                        let szMsg = `Report Feedback: status=${status}`;

                        if ((typeof error === 'string') && (error.length > 0))
                            szMsg += ` | error=${error}`;

                        if (typeof data === 'string')
                            szMsg += ` | data=${data}`;

                        console.log (szMsg);
                    }

                    // Navigate to Next-URL
                    const szURL = buildTargetUrl(_jsonConfig.navigation.nextUrl);
                    navigateTo (szURL);
                });
            }
            else
                navigateTo (buildTargetUrl(_jsonConfig.navigation.nextUrl));
        });
}

function applyConfiguration ()
{
    // Preload images (for better user experience)
    preloadImages();
    
    // Create buttons
    createButtons();

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
    if (!_jsonConfig.rateButton) szErrors = concatLine(szErrors, "'rateButton' section is missing");
    if (!_jsonConfig.signButton) szErrors = concatLine(szErrors, "'signButton' section is missing");
    if (!_jsonConfig.navigation) szErrors = concatLine(szErrors, "'navigation' section is missing");

    if (szErrors)
        return szErrors;

    if (!_jsonConfig.design.numberRateButtons)   szErrors = concatLine(szErrors, "'design.numberRateButtons' is missing");
    if (!_jsonConfig.rateButton.idleImage)       szErrors = concatLine(szErrors, "'rateButton.idleImage' is missing");
    if (!_jsonConfig.signButton.plus_idleImage)  szErrors = concatLine(szErrors, "'signButton.plus_idleImage' is missing");
    if (!_jsonConfig.signButton.minus_idleImage) szErrors = concatLine(szErrors, "'signButton.minus_idleImage' is missing");

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