$(function() {

    $("#subscribeForm input").jqBootstrapValidation({
        preventSubmit: true,
        submitError: function($form, event, errors) {
          // additional error messages or events
        },
        submitSuccess: function($form, event) {
          event.preventDefault(); // prevent default submit behaviour
          // get values from FORM
          var email = $("input#subscribeEmail").val();
    
          $this = $("#subscribeButton");
          $this.prop("disabled", true); // Disable submit button until AJAX call is complete to prevent duplicate messages
          $.ajax({
            url: "././mail/contact_me.php",
            type: "POST",
            data: {
              name: "New Subscriber",
              subject: "Someone new wants to subscribe!",
              email: email,
              message: "Please add " + email + " to your subscriber list!"
            },
          cache: false,
          success: function() {
            // Success message
            $('#subscribeStatus').html("<div class='alert alert-success'>");
            $('#subscribeStatus > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
              .append("</button>");
            $('#subscribeStatus > .alert-success')
              .append("<strong>Super choice!</strong>");
            $('#subscribeStatus > .alert-success')
              .append('</div>');
            //clear all fields
            $('#subscribeForm').trigger("reset");
          },
          error: function() {
            // Fail message
            $('#subscribeStatus').html("<div class='alert alert-danger'>");
            $('#subscribeStatus > .alert-danger').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
              .append("</button>");
            $('#subscribeStatus > .alert-danger').append($("<strong>").text("Sorry, it seems that my mail server is not responding. Please try again later!"));
            $('#subscribeStatus > .alert-danger').append('</div>');
            //clear all fields
            $('#subscribeForm').trigger("reset");
          },
          complete: function() {
            setTimeout(function() {
              $this.prop("disabled", false); // Re-enable submit button when AJAX call is complete
            }, 1000);
          }
        });
      },
      filter: function() {
        return $(this).is(":visible");
      },
    });
  
    $("a[data-toggle=\"tab\"]").click(function(e) {
      e.preventDefault();
      $(this).tab("show");
    });
  });
  
  /*When clicking on Full hide fail/success boxes */
  $('#name').focus(function() {
    $('#success').html('');
  });
  