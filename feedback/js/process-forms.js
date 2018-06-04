'use strict';
var feedbackForm = (function () {
  // переключить во включенное или выключенное состояние кнопку submit
  var _changeStateSubmit = function (element, state) {
    $(element)
      .closest('form')
      .find('[type="submit"]').prop('disabled', state);
  };
  // изменение состояния кнопки submit в зависимости от состояния checkbox agree
  var _changeAgreement = function (element) {
    _changeStateSubmit(element, !element.checked);
  };
  // обновление капчи
  var _refreshCaptcha = function (form) {
    var
      captchaImg = form.find('.img-captcha'),
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
  var _validateForm = function (_$form) {
    var valid = true;
    _$form.find('input,textarea').not('[type="file"],[name="agree"]').each(function () {
      if (this.checkValidity()) {
        _setStateValidaion(this, 'success');
      } else {
        _setStateValidaion(this, 'error', this.validationMessage);
        valid = false;
      }
    });
    return valid;
  };
  var _showForm = function (form, _isCaptcha, _isAgreeCheckbox) {
    if (!form.find('.form-error').hasClass('d-none')) {
      form.find('.form-error').addClass('d-none');
    }
    form.siblings('.form-result-success').addClass('d-none').removeClass('d-flex');
    form[0].reset();
    form.find('input,textarea').each(function () {
      _setStateValidaion(this, 'clear');
    });
    if (_isCaptcha) {
      _refreshCaptcha(form);
    }
    if (_isAgreeCheckbox) {
      _changeStateSubmit(form, true);
    }
  };

  return function () {
    var _defaults = {
      id: '#feedbackForm' // id формы обратной связи
    }
    var
      _form = $(_defaults.id)[0], // форма обратной связи
      _$form = $(_form),
      _action = $(_form).attr('action'),
      _isCaptcha = false,  // имеется ли у формы секция captcha
      _isAgreeCheckbox = false; // имеется ли у формы секция agreement

    // собираем данные для отправки на сервер
    var _collectData = function () {
      var data = new FormData(_form);
      return data;
    };

    // отправка формы
    var _sendForm = function (e) {
      e.preventDefault();
      if (!_validateForm(_$form)) {
        if (_$form.find('.is-invalid').length > 0) {
          _$form.find('.is-invalid')[0].focus();
        }
        return;
      }
      var request = $.ajax({
        type: "POST",
        url: _action,
        data: _collectData(), // данные для отправки на сервер
        contentType: false,
        processData: false,
        cache: false,
        beforeSend: function () {
          _changeStateSubmit(_$form, true);
        }
      })
        .done(_success)
        .fail(_error)
    };
    var _success = function (data) {
      // при успешной отправки формы
      if (data.result === "success") {
        _$form.parent().find('.form-result-success')
          .removeClass('d-none')
          .addClass('d-flex');
        return;
      }
      // если произошли ошибки при отправке
      _$form.find('.form-error').removeClass('d-none');
      _changeStateSubmit(_$form, false);
      // сбрасываем состояние всех input и textarea элементов
      _$form.find('input,textarea').not('[type="file"],[name="agree"]').each(function () {
        _setStateValidaion(this, 'clear');
      });
      // выводим ошибки которые прислал сервер
      for (var error in data) {
        if (!data.hasOwnProperty(error)) {
          continue;
        };
        switch (error) {
          case 'captcha':
            _refreshCaptcha(_$form);
            _setStateValidaion(_$form.find('[name="' + error + '"]'), 'error', data[error]);
            break;
          case 'log':
            $.each(data[error], function (key, value) {
              console.log(value);
            });
            break;
          default:
            _setStateValidaion(_$form.find('[name="' + error + '"]'), 'error', data[error]);
        }
        // устанавливаем фокус на 1 невалидный элемент
        if (_$form.find('.is-invalid').length > 0) {
          _$form.find('.is-invalid')[0].focus();
        }
      }
    };
    var _error = function (request) {
      _$form.find('.form-error').removeClass('d-none');
    };

    // устанавливаем обработчики событий
    var _setupListener = function () {
      $(document).on('change', _defaults.id + ' [name="agree"]', function () {
        _changeAgreement(this);
      });
      $(document).on('submit', _defaults.id, _sendForm);
      $(document).on('click', _defaults.id + ' .refresh-captcha', function (e) {
        e.preventDefault();
        _refreshCaptcha(_$form);
      });
      $(document).on('click', '[data-reloadform="' + _defaults.id + '"]', function (e) {
        e.preventDefault();
        _showForm(_$form, _isCaptcha, _isAgreeCheckbox);
      });
    }

    return {
      init: function (config) {
        _isCaptcha = _$form.find('.captcha').length > 0; // имеется ли у формы секция captcha
        _isAgreeCheckbox = _$form.find('.agreement').length > 0; // имеется ли у формы секция agreement
        $.each(config, function (key, value) {
          _defaults[key] = value;
        });
        _setupListener();
      }
    };
  }
})();