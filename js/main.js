import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import 'pepjs';

// Make functions global for onclick handlers
window.randomAnimation = randomAnimation;
window.changeModel = changeModel;

// On Document Loaded - Initialize Babylon then Start Game //
window.addEventListener("DOMContentLoaded", () => {
    initBabylon();
    startGame();
});

// Global BabylonJS Variables
let canvas, engine, scene, camera, dirLight, hemiLight, shadowGenerator;

// Model Navigation Variables
const modelList = [
    "Allstate-Bear.glb",
    "josh-kong.glb",
    "JOSH.glb",
    "moose.glb",
    "Noble-Dog.glb",
    "readyplayer.glb",
    "readyplayer2.glb",
    "scientiest.glb",
    "tv-man.glb"
];
let currentModelIndex = modelList.indexOf("readyplayer2.glb"); // Start with current model

function initBabylon() {
    canvas = document.getElementById("renderCanvas");
    engine = new BABYLON.Engine(canvas, true, { stencil: false }, true);
    scene = createScene(engine, canvas);
    camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(-90), BABYLON.Tools.ToRadians(65), 6, BABYLON.Vector3.Zero(), scene);
    dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0,0,0), scene);
    hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight, true);
}

var ground;
var hdrTexture;
var hdrRotation = 0;

var currentAnimation;

// Create Scene
function createScene(engine, canvas) {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    return scene;
}

// Start Game
function startGame() {
    // Set Canvas & Engine //
    var toRender = function () {
        scene.render();
    }
    engine.runRenderLoop(toRender);
    
    createCamera();

    // Hemispheric Light //
    hemiLight.intensity = 0.1;

    // Directional Light //
    dirLight.intensity = 1.5;
    dirLight.position = new BABYLON.Vector3(0,30,10);
    dirLight.direction = new BABYLON.Vector3(-2, -4, -5);

    // Cylinder Ground //
    ground = BABYLON.MeshBuilder.CreateCylinder("ground", {diameter: 7, height: 0.2, tessellation: 80}, scene);
    ground.position.y = -0.1;
    ground.isPickable = false;
    var groundMat = new BABYLON.PBRMaterial("groundMaterial", scene);
    groundMat.albedoColor = new BABYLON.Color3(0,0,0);
    groundMat.roughness = 0.8;
    groundMat.metallic = 0.2;
    groundMat.specularIntensity = 0.1;
    ground.material = groundMat;
    ground.receiveShadows = true;

    // Load environment first, then model
    loadEnvironment().then(() => {
        importAnimationsAndModel(modelList[currentModelIndex]);
    }).catch(error => {
        console.error("Failed to load environment:", error);
        // Load model even if environment fails
        importAnimationsAndModel(modelList[currentModelIndex]);
    });

    // scene.debugLayer.show({embedMode: true}).then(function () {
    // });
}

// Create ArcRotateCamera //
function createCamera() {  
    camera.position.z = 10;
    camera.setTarget(new BABYLON.Vector3(0, 1, 0));
    camera.allowUpsideDown = false;
    camera.panningSensibility = 0;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 16;
    camera.lowerBetaLimit = 0.75;
    camera.upperBetaLimit = Math.PI / 2;
    camera.panningSensibility = 0;
    camera.pinchDeltaPercentage = 0.00050;
    camera.wheelPrecision = 60;
    camera.useBouncingBehavior = false;
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior.idleRotationSpeed = 0.15;
    camera.radius = 5;
    camera.attachControl(canvas, true);
}

// Setup Animations & Player
var player;
var animationsGLB = [];
// Import Animations and Models
async function importAnimationsAndModel(model) {
    try {
        // Reset animations array
        animationsGLB = [];
        
        // Load base idle animation
        await importAnimations("/resources/models/animations/masculine/idle/M_Standing_Idle_Variations_002.glb").catch(error => {
            console.error("Error loading idle animation:", error);
        });

        // Load dance animations
        for (let index = 0; index < 9; index++) {
            try {
                const int = index + 1;
                await importAnimations("/resources/models/animations/masculine/dance/M_Dances_00" + int + ".glb");
            } catch (error) {
                console.error(`Error loading dance animation ${index + 1}:`, error);
                continue; // Continue with next animation if one fails
            }
        }

        // Load expression animations
        for (let index = 5; index < 9; index++) {
            try {
                const int = index + 1;
                await importAnimations("/resources/models/animations/masculine/expression/M_Standing_Expressions_00" + int + ".glb");
            } catch (error) {
                console.error(`Error loading expression animation ${index + 1}:`, error);
                continue; // Continue with next animation if one fails
            }
        }

        // Import model after animations are loaded
        await importModel(model);
    } catch (error) {
        console.error("Critical error in importAnimationsAndModel:", error);
        hideLoadingView(); // Ensure loading screen is hidden even if everything fails
    }
}

// Import Animations
async function importAnimations(animation) {
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(null, "." + animation, null, scene);
        
        // Clean up meshes
        result.meshes.forEach(element => {
            if (element) {
                try {
                    element.dispose();
                } catch (error) {
                    console.error("Error disposing mesh:", error);
                }
            }
        });

        // Store animation group
        if (result.animationGroups && result.animationGroups[0]) {
            animationsGLB.push(result.animationGroups[0]);
        } else {
            console.warn("No animation groups found in:", animation);
        }
    } catch (error) {
        console.error("Error importing animation:", animation, error);
        throw error; // Propagate error for handling in importAnimationsAndModel
    }
}
  
// Import Model
function importModel(model) {
    try {
        return BABYLON.SceneLoader.ImportMeshAsync(null, "./resources/models/" + model, null, scene)
            .then((result) => {
                try {
                    player = result.meshes[0];
                    player.name = "Character";

                    var modelTransformNodes = player.getChildTransformNodes();
                    
                    // Clone animations with error handling
                    animationsGLB.forEach((animation) => {
                        try {
                            const modelAnimationGroup = animation.clone(
                                model.replace(".glb", "_") + animation.name,
                                (oldTarget) => modelTransformNodes.find((node) => node.name === oldTarget.name)
                            );
                            animation.dispose();
                        } catch (error) {
                            console.error("Error cloning animation:", error);
                        }
                    });
                    animationsGLB = [];

                    // Apply materials and shadows after model is loaded
                    if (hdrTexture) {
                        setReflections();
                    }
                    setShadows();

                    // Start animation if available
                    if (scene.animationGroups && scene.animationGroups.length > 0) {
                        scene.animationGroups[0].play(true, 1.0);
                        document.getElementById("info-text").innerHTML = "Current Animation<br>" + scene.animationGroups[0].name;
                        currentAnimation = scene.animationGroups[0];
                    } else {
                        console.warn("No animation groups available");
                    }

                    hideLoadingView();
                } catch (error) {
                    console.error("Error processing model:", error);
                    hideLoadingView();
                }
            })
            .catch((error) => {
                console.error("Error loading model:", error);
                hideLoadingView();
            });
    } catch (error) {
        console.error("Critical error in importModel:", error);
        hideLoadingView();
    }
}

// Random Number
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random Animation Function
var disableButton = false;
function randomAnimation() {  

    if (disableButton)
        return;
    disableButton = true;
    setTimeout(() => {
        disableButton = false;
    }, 500);

    var randomNumber = getRandomInt(1, 13);
    var newAnimation = scene.animationGroups[randomNumber];
    // console.log("Random Animation: " + newAnimation.name);

    // Check if currentAnimation === newAnimation
    while (currentAnimation === newAnimation) {
        randomNumber = getRandomInt(1, 9);
        newAnimation = scene.animationGroups[randomNumber];
        console.log("Rechecking Anim: " + newAnimation.name);
    }

    scene.onBeforeRenderObservable.runCoroutineAsync(animationBlending(currentAnimation, 1.0, newAnimation, 1.0, true, 0.02));
    document.getElementById("info-text").innerHTML = "Current Animation<br>" + newAnimation.name;
}

// Animation Blending
function* animationBlending(fromAnim, fromAnimSpeedRatio, toAnim, toAnimSpeedRatio, repeat, speed)
{
    let currentWeight = 1;
    let newWeight = 0;
    fromAnim.stop();
    toAnim.play(repeat);
    fromAnim.speedRatio = fromAnimSpeedRatio;
    toAnim.speedRatio = toAnimSpeedRatio;
    while(newWeight < 1)
    {
        newWeight += speed;
        currentWeight -= speed;
        toAnim.setWeightForAllAnimatables(newWeight);
        fromAnim.setWeightForAllAnimatables(currentWeight);
        yield;
    }

    currentAnimation = toAnim;
}

// Environment Lighting
async function loadEnvironment() {
    return new Promise((resolve, reject) => {
        try {
            // Use default environment texture
            hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
                "https://assets.babylonjs.com/environments/environmentSpecular.dds",
                scene
            );

            hdrTexture.onLoadObservable.addOnce(() => {
                try {
                    hdrTexture.rotationY = BABYLON.Tools.ToRadians(hdrRotation);
                    
                    resolve();
                } catch (error) {
                    console.error("Error creating skybox:", error);
                    resolve(); // Continue even if skybox creation fails
                }
            });

            hdrTexture.onLoadErrorObservable.addOnce((error) => {
                console.error("Error loading environment texture:", error);
                resolve(); // Continue without environment
            });
        } catch (error) {
            console.error("Critical error in loadEnvironment:", error);
            resolve(); // Continue without environment
        }
    });
}

// Set Shadows
function setShadows() {
    scene.meshes.forEach(function(mesh) {
        if (mesh.name != "ground") {
            shadowGenerator.darkness = 0.1;
            shadowGenerator.bias = 0.00001;
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.addShadowCaster(mesh);
        }
    });
}

// Set Reflections
function setReflections() {
    scene.materials.forEach(function (material) {
        material.reflectionTexture = hdrTexture;
        material.reflectionTexture.level = 0.9;
        material.environmentIntensity = 0.7;
        material.disableLighting = false;
    });
}

// Hide Loading View
function hideLoadingView() {
    document.getElementById("loadingDiv").style.display = "none";
}

// Model Navigation Functions
async function changeModel(direction) {
    // Show loading screen
    document.getElementById("loadingDiv").style.display = "block";
    
    // Update model index
    if (direction === 'next') {
        currentModelIndex = (currentModelIndex + 1) % modelList.length;
    } else {
        currentModelIndex = (currentModelIndex - 1 + modelList.length) % modelList.length;
    }

    try {
        // Dispose current model and animations
        if (player) {
            // Stop all animations
            scene.animationGroups.slice().forEach(group => {
                group.stop();
                group.dispose();
            });
            
            // Dispose the model and its children
            player.getChildMeshes().forEach(mesh => {
                if (mesh) {
                    mesh.dispose();
                }
            });
            player.dispose();
        }

        // Clear animation arrays and reset state
        animationsGLB = [];
        currentAnimation = null;

        // Import new model with its animations
        await importAnimationsAndModel(modelList[currentModelIndex]);
        
        // Update info text
        if (scene.animationGroups && scene.animationGroups.length > 0) {
            document.getElementById("info-text").innerHTML = "Current Animation<br>" + scene.animationGroups[0].name;
        }
    } catch (error) {
        console.error("Error changing model:", error);
        hideLoadingView();
    }
}

// Resize Window
window.addEventListener("resize", function () {
    engine.resize();
});
