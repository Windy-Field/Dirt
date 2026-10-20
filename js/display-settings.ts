const NiyunDisplaySettings = (function registerDisplaySettings() {
    "use strict";
    return {
        create(dependencies: SettingsDependencies) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const getSettings = source1.getSettings;
            const updateSetting = source1.updateSetting;
            const resetSettings = source1.resetSettings;
            const defaults = source1.defaults;
            const ranges = source1.ranges;
            const openingKey = source1.openingKey;
            const reducedMotion = source1.reducedMotion;
            const applySettings = source1.applySettings;
            const showToast = source1.showToast;
            const dispatchReset = source1.dispatchReset;
            const dialog = (document.querySelector("#settingsDialog") as HTMLDialogElement);
            const form = (document.querySelector("#settingsForm") as HTMLFormElement);
            const openButton = (document.querySelector("#openSettings") as HTMLButtonElement);
            const outputs = {
                motionIntensity: (document.querySelector("#motionValue") as HTMLOutputElement),
                tiltDegrees: (document.querySelector("#tiltValue") as HTMLOutputElement),
                dustQuantity: (document.querySelector("#dustValue") as HTMLOutputElement),
                dustSpeed: (document.querySelector("#dustSpeedValue") as HTMLOutputElement),
            };
            const describe = {
                motionIntensity: function (value) {
                    let valueResult1;
                    if (value === 0) {
                        valueResult1 = "0%，关闭空间位移";
                    }
                    else {
                        let valueResult3;
                        if (value <= 30) {
                            valueResult3 = "轻微";
                        }
                        else {
                            let valueResult5;
                            if (value <= 70) {
                                valueResult5 = "标准";
                            }
                            else {
                                valueResult5 = "明显";
                            }
                            valueResult3 = valueResult5;
                        }
                        valueResult1 = ("" + (value) + "%，" + valueResult3 + "动效");
                    }
                    return valueResult1;
                },
                tiltDegrees: function (value) {
                    let valueResult7;
                    if (value === 0) {
                        valueResult7 = "0 度，关闭卡片倾斜";
                    }
                    else {
                        let valueResult9;
                        if (value <= 2) {
                            valueResult9 = "轻微";
                        }
                        else {
                            let valueResult11;
                            if (value <= 4) {
                                valueResult11 = "标准";
                            }
                            else {
                                valueResult11 = "明显";
                            }
                            valueResult9 = valueResult11;
                        }
                        valueResult7 = ("" + (value) + " 度，" + valueResult9 + "立体效果");
                    }
                    return valueResult7;
                },
                dustQuantity: function (value) {
                    let valueResult13;
                    if (value === 0) {
                        valueResult13 = "0 粒，关闭背景微尘";
                    }
                    else {
                        let valueResult15;
                        if (value <= 8) {
                            valueResult15 = "少量";
                        }
                        else {
                            let valueResult17;
                            if (value <= 20) {
                                valueResult17 = "适量";
                            }
                            else {
                                valueResult17 = "较多";
                            }
                            valueResult15 = valueResult17;
                        }
                        valueResult13 = ("" + (value) + " 粒，" + valueResult15 + "微尘");
                    }
                    return valueResult13;
                },
                dustSpeed: function (value) {
                    let valueResult19;
                    if (value === 0) {
                        valueResult19 = "0%，微尘静止";
                    }
                    else {
                        let valueResult21;
                        if (value <= 70) {
                            valueResult21 = "缓慢漂移";
                        }
                        else {
                            let valueResult23;
                            if (value <= 130) {
                                valueResult23 = "标准速度";
                            }
                            else {
                                valueResult23 = "快速漂移";
                            }
                            valueResult21 = valueResult23;
                        }
                        valueResult19 = ("" + (value) + "%，" + valueResult21);
                    }
                    return valueResult19;
                },
            };
            // 打开设置时，把当前保存的值填回单选框、滑块和开关
            function sync() {
                if (!form) {
                    return;
                }
                const settings = getSettings();
                const items14 = (form.querySelectorAll("[name=\"themeMode\"]") as NodeListOf<HTMLInputElement>);
                for (let index16 = 0; index16 < items14.length; index16++) {
                    {
                        const input = items14[index16];
                        input.checked = input.value === settings.themeMode;
                    }
                }
                const openingInput = (document.querySelector("#openingAnimationEnabled") as HTMLInputElement);
                if (openingInput) {
                    openingInput.checked = localStorage.getItem(openingKey) !== "false";
                }
                const rangesMap = {
                    motionIntensity: ranges.pageMotion,
                    tiltDegrees: ranges.cardTilt,
                    dustQuantity: ranges.backgroundDust,
                    dustSpeed: ranges.backgroundDustSpeed,
                };
                const items19 = Object.entries(rangesMap);
                for (let index21 = 0; index21 < items19.length; index21++) {
                    {
                        const options23 = items19[index21];
                        const source24 = options23;
                        const name = source24[0];
                        const range = source24[1];
                        const input = form.elements[name];
                        if (!input) {
                            undefined;
                        }
                        else {
                            Object.assign(input, { min: range.min, max: range.max, step: range.step, value: settings[name] });
                            input.setAttribute("aria-valuetext", describe[name](settings[name]));
                        }
                    }
                }
                outputs.motionIntensity.value = ("" + (settings.motionIntensity) + (ranges.pageMotion.unit));
                outputs.tiltDegrees.value = ("" + (settings.tiltDegrees) + (ranges.cardTilt.unit));
                outputs.dustQuantity.value = ("" + (settings.dustQuantity) + " " + (ranges.backgroundDust.unit));
                outputs.dustSpeed.value = ("" + (settings.dustSpeed) + (ranges.backgroundDustSpeed.unit));
                const systemNote = (document.querySelector("#systemMotionNote") as HTMLElement);
                if (systemNote) {
                    systemNote.hidden = !reducedMotion;
                }
            }
            function animate(open: boolean) {
                let valueResult33;
                const value26 = dialog;
                if (value26 === null || value26 === undefined) {
                    valueResult33 = undefined;
                }
                else {
                    const value27 = value26.querySelector;
                    valueResult33 = value27.call(value26, ".settings-panel");
                }
                const panel = (valueResult33 as HTMLElement);
                if (!panel) {
                    return null;
                }
                const items29 = panel.getAnimations();
                for (let index31 = 0; index31 < items29.length; index31++) {
                    {
                        const item = items29[index31];
                        item.cancel();
                    }
                }
                let valueResult39;
                if (open) {
                    valueResult39 = [{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0)" }];
                }
                else {
                    valueResult39 = [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 0 100%)" }];
                }
                let valueResult41;
                if (reducedMotion) {
                    valueResult41 = 1;
                }
                else {
                    valueResult41 = 300;
                }
                return panel.animate(valueResult39, { duration: valueResult41, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" });
            }
            async function close() {
                let valueResult43;
                const value36 = dialog;
                if (value36 === null || value36 === undefined) {
                    valueResult43 = undefined;
                }
                else {
                    valueResult43 = value36.open;
                }
                if (!valueResult43 || dialog.classList.contains("is-closing")) {
                    return;
                }
                dialog.classList.add("is-closing");
                const animation = animate(false);
                if (animation) {
                    try {
                        await animation.finished;
                    }
                    catch (_) {
                        return;
                    }
                }
                dialog.classList.remove("is-closing");
                dialog.close();
            }
            function init() {
                let valueResult45;
                const value38 = openButton;
                if (value38 === null || value38 === undefined) {
                    valueResult45 = undefined;
                }
                else {
                    const value39 = value38.addEventListener;
                    valueResult45 = value39.call(value38, "click", function handleClick() {
                        sync();
                        dialog.showModal();
                        animate(true);
                        openButton.setAttribute("aria-expanded", "true");
                        let valueResult47;
                        const value40 = (document.querySelector("#closeSettings") as HTMLButtonElement);
                        if (value40 === null || value40 === undefined) {
                            valueResult47 = undefined;
                        }
                        else {
                            const value41 = value40.focus;
                            valueResult47 = value41.call(value40);
                        }
                    });
                }
                let valueResult49;
                const value44 = (document.querySelector("#closeSettings") as HTMLButtonElement);
                if (value44 === null || value44 === undefined) {
                    valueResult49 = undefined;
                }
                else {
                    const value45 = value44.addEventListener;
                    valueResult49 = value45.call(value44, "click", close);
                }
                let valueResult51;
                const value47 = (document.querySelector("#doneSettings") as HTMLButtonElement);
                if (value47 === null || value47 === undefined) {
                    valueResult51 = undefined;
                }
                else {
                    const value48 = value47.addEventListener;
                    valueResult51 = value48.call(value47, "click", close);
                }
                let valueResult53;
                const value50 = dialog;
                if (value50 === null || value50 === undefined) {
                    valueResult53 = undefined;
                }
                else {
                    const value51 = value50.addEventListener;
                    valueResult53 = value51.call(value50, "click", function handleClick(event) {
                        if (event.target === dialog) {
                            close();
                        }
                    });
                }
                let valueResult55;
                const value53 = dialog;
                if (value53 === null || value53 === undefined) {
                    valueResult55 = undefined;
                }
                else {
                    const value54 = value53.addEventListener;
                    valueResult55 = value54.call(value53, "cancel", function handleCancel(event) {
                        event.preventDefault();
                        close();
                    });
                }
                let valueResult57;
                const value56 = dialog;
                if (value56 === null || value56 === undefined) {
                    valueResult57 = undefined;
                }
                else {
                    const value57 = value56.addEventListener;
                    valueResult57 = value57.call(value56, "close", function handleClose() {
                        let valueResult59;
                        const value58 = openButton;
                        if (value58 === null || value58 === undefined) {
                            valueResult59 = undefined;
                        }
                        else {
                            const value59 = value58.setAttribute;
                            valueResult59 = value59.call(value58, "aria-expanded", "false");
                        }
                        let valueResult61;
                        const value61 = openButton;
                        if (value61 === null || value61 === undefined) {
                            valueResult61 = undefined;
                        }
                        else {
                            const value62 = value61.focus;
                            valueResult61 = value62.call(value61);
                        }
                    });
                }
                let valueResult63;
                const value65 = form;
                if (value65 === null || value65 === undefined) {
                    valueResult63 = undefined;
                }
                else {
                    const value66 = value65.addEventListener;
                    valueResult63 = value66.call(value65, "input", function handleInput(event) {
                        const input = event.target;
                        if (!(input instanceof HTMLInputElement)) {
                            return;
                        }
                        if (input.id === "openingAnimationEnabled") {
                            localStorage.setItem(openingKey, String(input.checked));
                            return;
                        }
                        if (!input.name) {
                            return;
                        }
                        let valueResult65;
                        if (input.type === "range") {
                            valueResult65 = Number(input.value);
                        }
                        else {
                            valueResult65 = input.value;
                        }
                        updateSetting(input.name, valueResult65);
                        applySettings();
                        sync();
                    });
                }
                let valueResult67;
                const value69 = (document.querySelector("#resetSettings") as HTMLButtonElement);
                if (value69 === null || value69 === undefined) {
                    valueResult67 = undefined;
                }
                else {
                    const value70 = value69.addEventListener;
                    valueResult67 = value70.call(value69, "click", function handleClick() {
                        resetSettings();
                        applySettings();
                        localStorage.setItem(openingKey, "true");
                        dispatchReset();
                        sync();
                        showToast("显示设置已恢复默认");
                    });
                }
                sync();
            }
            return { init: init, sync: sync };
        },
    };
})();
window.NiyunDisplaySettings = NiyunDisplaySettings;
