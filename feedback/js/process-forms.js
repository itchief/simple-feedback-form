'use strict';

var ProcessForm = function (config) {
    var _config = {
        selector: '#feedbackForm', // селектор формы обратной связи
        isCaptcha: true, // наличие капчи
        isAgreement: true  // наличие пользовательского соглашения
    }
    for (prop in config) {
        _config[prop] = config[prop];
    }
    this.getConfig = function () {
        return _config;
    }
    this.getForm = function () {
        return $(_config.selector)[0];
    }
    this.setIsCaptcha = function (value) {
        _config.isCaptcha = value;
    }
    this.setIsAgreement = function (value) {
        _config.isAgreement = value;
    }
};

ProcessForm.prototype = function () {
    // переключить во включенное или выключенное состояние кнопку submit
    var _changeStateSubmit = function (form, state) {
        $(form).find('[type="submit"]').prop('disabled', state);
    };
    // изменение состояния кнопки submit в зависимости от состояния checkbox agree
    var _changeAgreement = function (form, state) {
        _changeStateSubmit(form, state);
    };
    // обновление капчи
    var _refreshCaptcha = function (form) {
        var
            captchaImg = $(form).find('.img-captcha'),
            captchaSrc = captchaImg.attr('data-src'),
            captchaPrefix = captchaSrc.indexOf('?id') !== -1 ? '&rnd=' : '?rnd=',
            captchaNewSrc = captchaSrc + captchaPrefix + (new Date()).getTime();
        captchaImg.attr('src', captchaNewSrc);
    };
    // изменение состояния элемента формы (success, error, clear)
    var _setStateValidaion = function (input, state, message) {
        input = $(input);
        if (state === 'error') {
            input
                .removeClass('is-valid').addClass('is-invalid')
                .siblings('.invalid-feedback').text(message);
        } else if (state === 'success') {
            input.removeClass('is-invalid').addClass('is-valid');
        } else {
            input.removeClass('is-valid is-invalid');
        }
    };
    // валилация формы
    var _validateForm = function (form) {
        var valid = true;
        $(form).find('input, textarea').not('[type="file"], [name="agree"]').each(function () {
            if (this.checkValidity()) {
                _setStateValidaion(this, 'success');
            } else {
                _setStateValidaion(this, 'error', this.validationMessage);
                valid = false;
            }
        });
        return valid;
    };
    var _showForm = function (_this) {
        var
            form = _this.getForm(),
            $form = $(form);
        if (!$form.find('.form-error').hasClass('d-none')) {
            $form.find('.form-error').addClass('d-none');
        }
        $form.siblings('.form-result-success').addClass('d-none').removeClass('d-flex');
        form.reset();
        $form.find('input, textarea').each(function () {
            _setStateValidaion(this, 'clear');
        });
        if (_this.getConfig().isCaptcha) {
            _refreshCaptcha(form);
        }
        if (_this.getConfig().isAgreeCheckbox) {
            _changeStateSubmit(form, true);
        } else {
            _changeStateSubmit(form, false);
        }
    };
    // собираем данные для отправки на сервер
    var _collectData = function (_this) {
        return new FormData(_this);
    };
    // отправка формы
    var _sendForm = function (_this) {
        if (!_validateForm(_this)) {
            if ($(_this).find('.is-invalid').length > 0) {
                $(_this).find('.is-invalid')[0].focus();
            }
            return;
        }
        var request = $.ajax({
            context: _this,
            type: "POST",
            url: $(_this).attr('action'),
            data: _collectData(_this), // данные для отправки на сервер
            contentType: false,
            processData: false,
            cache: false,
            beforeSend: function () {
                _changeStateSubmit(_this, true);
            }
        })
            .done(_success)
            .fail(_error)
    };
    // при получении успешного ответа от сервера 
    var _success = function (data) {
        // при успешной отправки формы
        if (data.result === "success") {
            $(this).parent().find('.form-result-success')
                .removeClass('d-none')
                .addClass('d-flex');
            return;
        }
        // если произошли ошибки при отправке
        $(this).find('.form-error').removeClass('d-none');
        _changeStateSubmit(this, false);
        // сбрасываем состояние всех input и textarea элементов
        $(this).find('input, textarea').not('[type="file"], [name="agree"]').each(function () {
            _setStateValidaion(this, 'clear');
        });
        // выводим ошибки которые прислал сервер
        for (var error in data) {
            if (!data.hasOwnProperty(error)) {
                continue;
            };
            switch (error) {
                case 'captcha':
                    _refreshCaptcha($(this));
                    _setStateValidaion($(this).find('[name="' + error + '"]'), 'error', data[error]);
                    break;
                case 'log':
                    $.each(data[error], function (key, value) {
                        console.log(value);
                    });
                    break;
                default:
                    _setStateValidaion($(this).find('[name="' + error + '"]'), 'error', data[error]);
            }
            // устанавливаем фокус на 1 невалидный элемент
            if ($(this).find('.is-invalid').length > 0) {
                $(this).find('.is-invalid')[0].focus();
            }
        }
    };
    // если не получили успешный ответ от сервера 
    var _error = function (request) {
        $(this).find('.form-error').removeClass('d-none');
    };
    // функция для инициализации 
    var _init = function () {
        this.setIsCaptcha($(this.getForm()).find('.captcha').length > 0); // имеется ли у формы секция captcha
        this.setIsAgreement($(this.getForm()).find('.agreement').length > 0); // имеется ли у формы секция agreement
        _setupListener(this);
    }
    // устанавливаем обработчики событий
    var _setupListener = function (_this) {
        $(document).on('change', _this.getConfig().selector + ' [name="agree"]', function () {
            _changeAgreement(_this.getForm(), !this.checked);
        });
        $(document).on('submit', _this.getConfig().selector, function (e) {
            e.preventDefault();
            _sendForm(_this.getForm());
        });
        $(document).on('click', _this.getConfig().selector + ' .refresh-captcha', function (e) {
            e.preventDefault();
            _refreshCaptcha(_this.getForm());
        });
        $(document).on('click', '[data-reloadform="' + _this.getConfig().selector + '"]', function (e) {
            e.preventDefault();
            _showForm(_this);
        });
    }
    return {
        init: _init
    }
}();